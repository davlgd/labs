---
author: davlgd
pubDatetime: 2026-01-28T13:37:00Z
title: "cgroups v2: the limits your tools cannot see"
description: "free says 31 GB, the kernel disagrees"
tags:
  - Linux
  - Shell
  - Tools
ogImage: /images/2026-01-cgroups-container-limits.webp
---

[`nice`](/posts/2026-01-14-nice-priority/) changes who the scheduler serves first. [`taskset`](/posts/2025-12-03-taskset-cpu-affinity/) changes where a process may run. Neither of them caps anything. The actual ceiling on Linux is a control group, and if you run anything in a container you are already inside one.

## Where the limits live

cgroup v2 exposes everything as files under one tree:

```bash
$ findmnt -no FSTYPE /sys/fs/cgroup
cgroup2

$ cat /sys/fs/cgroup/cgroup.controllers
cpu memory pids
```

Three controllers here: CPU time, memory, process count. Each one is a handful of files you read and write like any other:

```bash
$ cd /sys/fs/cgroup

$ cat cpu.max cpu.weight memory.max pids.max
max 100000
100
max
2048
```

`cpu.max` reads `max 100000`: no quota, over a 100 millisecond period. Set it to `50000 100000` and the group gets half a core. `cpu.weight` is the relative share when there is contention, the cgroup version of `nice`. And `pids.max` is capped at 2048 here, which turns out to matter.

## Your tools do not read any of this

Here is the problem that bites people in production. Inside that same container:

```bash
$ nproc
6

$ free -h | head -2
               total        used        free      shared  buff/cache   available
Mem:            31Gi        10Gi       436Mi       808Mi         21Gi        20Gi
```

Six CPUs and 31 GB of RAM. Those are the **host's** numbers. `nproc` reads the CPU affinity mask, `free` reads `/proc/meminfo`, and neither of them knows a control group exists.

That is how a JVM sizes its heap for a machine ten times bigger than the container it is in, and how a build system decides to run sixteen parallel jobs inside a group entitled to one core. The tool is not wrong, it is answering a different question from the one you meant.

The kernel will tell you the truth if you ask it directly:

```bash
# what this cgroup is actually allowed
$ cat /sys/fs/cgroup/memory.max /sys/fs/cgroup/cpu.max
max
max 100000
```

`max` here means unlimited, because my test container had no memory cap set. On a real orchestrator those files hold numbers, and they are the numbers your process should be sizing itself against.

## The limit is not decorative

I wanted to check that `pids.max` was enforced and not merely advisory, so I started spawning processes in a loop and watched what happened.

What happened is that the container stopped being able to do anything at all:

```text
Error: crun: fork: Resource temporarily unavailable
```

Not the loop failing, the container runtime failing to attach a new shell, because the group had no process slots left for it either. I had to destroy and recreate the container.

That is the difference between a control group and `nice`. `nice` asks politely. A cgroup limit is a wall, and everything in the group hits it at the same time, including the things you were counting on to get you out of trouble.

## Pressure, the metric worth knowing

cgroup v2 also exposes PSI, telling you how long tasks in the group spent *waiting* for a resource:

```bash
$ cat /sys/fs/cgroup/cpu.pressure
some avg10=0.00 avg60=0.00 avg300=0.00 total=1946
full avg10=0.00 avg60=0.00 avg300=0.00 total=1938
```

`some` is the share of time at least one task was stalled, `full` the share where everything was. Averages over 10, 60 and 300 seconds. Load average tells you how many things are runnable, which conflates a busy machine with a starving one. This tells you directly whether anyone is waiting, and there are equivalent files for `memory` and `io`.

## Setting a limit yourself

Writing to these files by hand needs a delegated, writable cgroup, which a rootless container does not get: mine was mounted read only and `mkdir /sys/fs/cgroup/demo` answered `Read-only file system`. On a normal systemd host the supported route is:

```bash
systemd-run --scope -p CPUQuota=50% -p MemoryMax=1G ./job.sh
```

That creates a transient scope, applies the limits and cleans up afterwards, a great deal safer than editing the tree under `/sys/fs/cgroup` yourself. I have not pasted its output here because the container I test in has no systemd to run it under, and I would rather leave a gap than invent a transcript.
