---
author: davlgd
pubDatetime: 2026-01-14T13:37:00Z
title: "nice: being polite with the scheduler"
description: "Priority is not a quota"
tags:
  - Shell
  - Linux
  - Tools
ogImage: /images/2026-01-nice-scheduler-priority.webp
---

`nice` is the command people reach for when a job is eating the machine. It rarely does what they expect, because it does not limit anything. It changes who the scheduler serves first, and that only matters when there is a queue.

## What the number means

Niceness runs from -20 to 19. Higher is nicer: the process yields to others. Lower is greedier. The default is 0, and `nice` with no arguments prints the current value:

```bash
$ nice
0

$ nice nice
10
```

The second one is worth noticing. Running `nice` through `nice` shows 10, because the default increment is +10 when you do not pass `-n`. So `nice ./job.sh` is already a meaningful demotion.

## It does nothing until there is competition

This is the part that surprises people, and it is easy to demonstrate. Two identical busy loops for eight seconds, one at nice 0 and one at nice 19, on a six core machine:

```text
nice 0  : 4705843
nice 19 : 4757164
```

The nice 19 process did slightly *more* work. Not a mistake: there were six cores and two processes, so nobody had to wait, and priority never came into play.

Now the same two loops confined to a single core with [`taskset`](/posts/2025-12-03-taskset-cpu-affinity/), so they have to share:

```bash
# count iterations for 8 seconds, at a given niceness
$ cat burn.sh
#!/bin/bash
s=0; end=$((SECONDS + 8))
while (( SECONDS < end )); do (( s++ )); done
echo "nice $(nice): $s"

# both loops on core 0, forcing them to compete
$ taskset -c 0 bash -c '( nice -n 0 ./burn.sh ) & ( nice -n 19 ./burn.sh ) & wait'
```

```text
nice 0  : 6232465
nice 19 : 93877
```

A factor of 66. Same commands, same durations, and the only change is that the two processes now want the same core at the same time.

That is the whole lesson. `nice` redistributes a contended resource. On an idle machine it is a no-op, and if your build is slow because the disk is busy, no amount of niceness will help.

## Going down is free, going up needs permission

Raising the number is always allowed. Lowering it is not:

```bash
$ nice -n -5 nice
nice: warning: setpriority: Permission denied (os error 13)
0
```

Read that output carefully. It printed a **warning**, then `0`, then exited with status 0. The command ran, at the priority it already had, and nothing told the script that the request failed. If you rely on a negative nice for a latency-sensitive job, check the result instead of trusting the exit code.

I got that even as root, because the container had no `CAP_SYS_NICE`:

```bash
$ id -u
0

$ ulimit -e
0
```

`ulimit -e` is the ceiling on how far you may lower niceness, and 0 means not at all. Rootless container runtimes commonly drop that capability, so a `nice -n -10` in your Dockerfile may be silently doing nothing in production.

## Changing your mind, and the disk

`renice` works on a process that is already running:

```bash
$ renice -n 15 -p 4362
4362 (process ID) old priority 0, new priority 15
```

Handy when a job you started an hour ago turns out to be in the way.

For I/O there is a separate knob, because CPU priority says nothing about disk access:

```bash
$ ionice
none: prio 0

$ ionice -c 3 ionice
idle

$ ionice -c 2 -n 7 ionice
best-effort: prio 7
```

The classes are `1` realtime, `2` best-effort and `3` idle, with `-n 0..7` setting the priority inside the first two. A backup at `nice 19` can still saturate your disk queue, and `ionice -c 3 ./backup.sh` is the flag that keeps it out of the way.

## On macOS

`nice` and `renice` are there and behave the same, including the refusal to go negative without `sudo`. `ionice` does not exist at all: I/O throttling on Darwin goes through `taskpolicy -d throttle`, which I covered [when comparing it to `taskset`](/posts/2025-12-17-taskpolicy-macos/).
