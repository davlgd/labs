---
author: davlgd
pubDatetime: 2025-12-03T13:37:00Z
title: "taskset: choosing which cores your command runs on"
description: "Pin it down"
tags:
  - Shell
  - Linux
  - Tools
ogImage: /images/2025-12-taskset-cpu-affinity.webp
---

You have a build that eats every core on the machine, and you would like to keep two of them for yourself. Or a benchmark whose numbers jump around because the scheduler keeps moving it between cores. Both are the same request: decide *where* a process runs. On Linux that is `taskset`.

## Affinity, not a quota

The distinction matters, because three different tools get confused with each other.

`taskset` sets the **CPU affinity**: the set of cores the scheduler is allowed to place the threads on. It does not cap how much CPU the process uses, it restricts where that usage can happen.

`nice` changes priority: who goes first, not how much. And a real ceiling, "no more than 50% of the machine", is a cgroup thing.

Affinity is a mask, one bit per core.

## Running something on specific cores

My test box has six:

```bash
$ nproc
6

$ cat /sys/devices/system/cpu/online
0-5
```

Start a command on two of them:

```bash
$ taskset -c 0,1 ./build.sh
```

`-c` takes a list: `0,1`, a range `2-5`, or a mix `0,2-4`. To read what a process has, point it at a PID:

```bash
$ sleep 30 &

$ taskset -cp $!
pid 4238's current affinity list: 0-5
```

`0-5` is the default: everything. And you can change it while the process runs, the flag combination worth remembering:

```bash
$ taskset -cp 0 4238
pid 4238's current affinity list: 0-5
pid 4238's new affinity list: 0
```

That process is now confined to core 0 without being restarted.

## The hex mask, and why -c exists

Before `-c`, you wrote the mask yourself, in hexadecimal, one bit per core:

```bash
$ taskset 0x3 ./build.sh
```

`0x3` is binary `11`, so cores 0 and 1. It is exactly equivalent to `-c 0,1`, and I checked that both produce the same affinity list. It's also how you end up computing `0x3f` in your head at 2am to mean "the first six cores". Use `-c`.

## Does it actually constrain anything?

Worth proving instead of trusting. Four infinite loops, measured with `ps`, adding up their CPU shares:

```bash
$ bash -c 'for i in 1 2 3 4; do (while :; do :; done) & done'
4 loops, unconstrained : 398%
```

Four cores saturated, as expected. Now the same four loops under `taskset`:

```bash
$ taskset -c 0 bash -c 'for i in 1 2 3 4; do (while :; do :; done) & done'
4 loops, taskset -c 0  : 99%
```

99%, one core, shared between four processes. Two things are proven at once: the restriction is real, and **affinity is inherited by children**. You set it once on the parent and the whole process tree obeys. That is what makes `taskset -c 0-3 make -j8` a useful thing to type.

## What it is genuinely good for

Reproducible benchmarks are the honest use case. Pinning a benchmark to one core removes the migration noise and the cache invalidation that comes with it, so your numbers stop wobbling.

Leaving yourself room is the other one. `taskset -c 0-3 make -j4` on a six-core box keeps two cores for your editor and your browser, and the machine stays usable.

Beyond that, be careful. The Linux scheduler is good, and it has more information than you do about what the machine is doing. Pinning by hand mostly means telling it to ignore some of that. The cases where you win are narrow: NUMA locality, isolating a latency-sensitive thread, or reproducing a measurement.

## And the thing it cannot do

`taskset` restricts to a set of cores. It cannot tell you *which* cores to prefer when they are not all the same, and it has no concept of a core being more or less power hungry.

On a machine with performance and efficiency cores, that turns out to matter a lot, and Linux is not where you meet that problem first.

My Mac is, and there `taskset` does not exist at all. What macOS offers instead is not an equivalent: you stop naming cores and start declaring intent, and the scheduler places the work. I measured what that costs on an M3 Pro in [the next post, about `taskpolicy`](/posts/2025-12-17-taskpolicy-macos/).
