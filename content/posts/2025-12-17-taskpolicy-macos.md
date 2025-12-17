---
author: davlgd
pubDatetime: 2025-12-17T13:37:00Z
title: "taskpolicy: the macOS answer to taskset"
description: "Ask, do not pin"
tags:
  - macOS
  - Apple
  - Shell
  - Tools
ogImage: /images/2025-12-taskpolicy-apple-silicon.webp
---

Last time I pinned processes to cores with [`taskset`](/posts/2025-12-03-taskset-cpu-affinity/). The natural next move is to do the same on my Mac, and the natural next discovery is that you cannot:

```bash
$ command -v taskset numactl chrt cpuset
$
```

None of them. And this one is not a `brew install` away either. Homebrew does package util-linux for macOS, but the formula is explicit about what it cannot build there, and `taskset` is on that list:

```bash
$ brew info util-linux
The following tools are not supported for macOS, and are therefore not included:
...
taskset
```

Which makes sense, because the tool would have nothing to call. Darwin does not expose a CPU affinity API the way Linux does. There is `thread_policy_set` with `THREAD_AFFINITY_POLICY`, but on Apple Silicon it is a hint the scheduler is free to ignore, and it does.

That sounds like a gap. It is closer to a different philosophy, and macOS ships the tool that expresses it.

## taskpolicy, which nobody mentions

It has been in `/usr/sbin` all along:

```bash
$ taskpolicy -c background ./build.sh

$ taskpolicy -b ./import.sh

$ taskpolicy -d throttle ./backup.sh

$ taskpolicy -p 12345 -b
```

Rather than naming cores, you declare what kind of work this is. `-c` sets a **QoS clamp** (`utility`, `background` or `maintenance`), `-b` puts the process in Darwin background priority, `-d throttle` throttles its disk I/O, and `-p` applies any of it to a process that is already running.

The scheduler then decides where the work goes. On Apple Silicon that means choosing between performance and efficiency cores, and it takes power, thermals and everything else running into account, which you cannot do from a shell.

## Does the clamp actually do anything?

This is the part I wanted to measure instead of assuming. My machine is an M3 Pro, and it is not homogeneous:

```bash
$ sysctl -n machdep.cpu.brand_string
Apple M3 Pro

$ sysctl -n hw.ncpu hw.perflevel0.physicalcpu hw.perflevel1.physicalcpu
12
6
6
```

Six performance cores, six efficiency cores. I ran the same busy loop for four seconds under each policy and counted iterations:

```text
normal                     59.05M iterations in 4s
taskpolicy -c utility      58.76M iterations in 4s
taskpolicy -c background   12.53M iterations in 4s
taskpolicy -c maintenance   9.68M iterations in 4s
taskpolicy -b               9.16M iterations in 4s
```

The clamp is real, and it is not subtle. `background` costs a factor of 4.7, `maintenance` 6.1, and Darwin background priority 6.4. Meanwhile `utility` is indistinguishable from normal, which tells you it still gets performance cores.

That spread is the E-cores becoming visible from a shell prompt, without `sudo` and without a profiler. A tight integer loop on a P-core versus the same loop on an E-core is roughly the ratio you see above.

## Intent, not placement

This is the mental shift, and it is worth stating plainly.

On Linux you **name the cores** and the scheduler obeys. On macOS you **declare an intention** and the scheduler places the work.

You cannot pin a process to the performance cores, and that is deliberate: the whole point of the design is that the system decides, so it can put your background indexing job on the efficiency cores while you type, and hand you the fast ones the moment you need them.

Which means the two commands are not really equivalents. `taskset` is a constraint. `taskpolicy` is a request, with priorities attached. If your goal is "stop this job from making my laptop hot and loud", `taskpolicy` answers it better than `taskset` ever would. If your goal is a reproducible benchmark pinned to one core, macOS has no answer for you.

## Watching it happen

Numbers are one thing, seeing it is another. [`asitop`](/posts/2024-01-apple-silicon-asitop/), which I wrote about a while back, reads the same counters as `powermetrics` and shows P-cluster and E-cluster load separately, plus package power in watts.

```bash
sudo asitop
```

Start a heavy job normally, watch the P-cluster fill and the wattage climb. Run the same job with `taskpolicy -c background` and watch the load move to the E-cluster while the power draw drops. It's the clearest demonstration of the whole idea, and it takes two terminals and no instrumentation.

One honest caveat: everything above is about *scheduling hints*, so results depend on what else the machine is doing. Run the measurement twice on a busy laptop and you will get two different ratios. The direction holds, the exact factor does not.
