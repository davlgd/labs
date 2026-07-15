---
author: davlgd
pubDatetime: 2026-07-15T13:37:00Z
title: "time: two of them, and you use the wrong one"
description: "The shell keyword hides the real command"
tags:
  - Shell
  - Tools
ogImage: /images/2026-07-time-measuring-commands.webp
---

Everyone times a command the same way, and almost nobody has run the program they think they are running. There are two `time`s on your system, they print different things, and the one you get by default is not a program at all.

## The one you type

```bash
$ type time
time is a shell keyword
```

Not a builtin, a **keyword**: part of the shell's grammar, like `if` or `while`. That is why `time` can measure a whole pipeline, which a normal command could never do.

Its output depends on your shell. `bash` gives you three lines:

```bash
$ time sleep 0.3

real	0m0.304s
user	0m0.000s
sys	0m0.003s
```

`zsh` puts the same information on one:

```bash
$ time sleep 0.3
sleep 0.3  0,00s user 0,00s system 0% cpu 0,309 total
```

Same three numbers. `real` is wall clock, `user` is CPU spent in your code, `sys` is CPU spent in the kernel on your behalf. When `real` is much larger than `user + sys`, your program was waiting on something rather than computing.

## The one you have to ask for

There is also a binary, and the shell keyword hides it. Call it by path:

```bash
$ /usr/bin/time sleep 0.3
0.00user 0.00system 0:00.30elapsed 1%CPU (0avgtext+0avgdata 7504maxresident)k
0inputs+0outputs (0major+449minor)pagefaults 0swaps
```

Same three timings, plus **peak memory** (`maxresident`), page faults and I/O counts. That memory number is the reason to know this command exists: the keyword cannot tell you how much RAM a build used, and this can.

GNU's version goes further with `-v`:

```bash
$ /usr/bin/time -v sleep 0.1
	Elapsed (wall clock) time (h:mm:ss or m:ss): 0:00.10
	Maximum resident set size (kbytes): 7488
	Voluntary context switches: 2
	Involuntary context switches: 0
```

Context switch counts distinguish a process that yielded politely from one the scheduler interrupted, which is a useful signal when something is slower than it should be.

For scripts, `-f` gives you exactly the fields you want:

```bash
$ /usr/bin/time -f "%e s, %M KB max" sleep 0.2
0.20 s, 7432 KB max
```

`%e` elapsed seconds, `%M` peak resident kilobytes. Two numbers, parseable, ready for a CSV of build measurements.

## macOS has neither of those flags

The binary is there, and it is the BSD one:

```bash
$ /usr/bin/time sleep 0.3
        0,31 real         0,00 user         0,00 sys
```

Three numbers, no memory, no page faults. The detailed mode exists under a different letter, `-l` instead of `-v`:

```bash
$ /usr/bin/time -l sleep 0.1
        0,10 real         0,00 user         0,00 sys
             1228800  maximum resident set size
```

Note that BSD reports the peak in **bytes** where GNU reports kilobytes, so the same process looks a thousand times bigger. And the custom format does not exist at all:

```bash
$ /usr/bin/time -f "%e"
/usr/bin/time: illegal option -- f
usage: time [-al] [-h | -p] [-o file] utility [argument ...]
```

For a portable script, `brew install gnu-time` provides the GNU implementation alongside the BSD one.

## Which to reach for

The keyword for a quick look, and for anything with a pipe in it, since it is the only one that can measure the whole thing.

The binary when you care about memory, or when you want a machine-readable line. And remember it is `/usr/bin/time`, in full, every time: typing `time` gets you the keyword no matter how much you meant otherwise.

A last note on measuring at all: one run tells you very little. `time` reports what happened once, on a machine that was doing other things. For anything you intend to act on, run it several times and look at the spread, or use a tool built for benchmarking.
