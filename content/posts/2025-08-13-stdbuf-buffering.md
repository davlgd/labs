---
author: davlgd
pubDatetime: 2025-08-13T13:37:00Z
title: "stdbuf: why your tail -f | grep prints nothing"
description: "The buffer nobody asked for"
tags:
  - Shell
  - Tools
ogImage: /images/2025-08-pipe-buffering-stdbuf.webp
---

You tail a log, filter it, and watch nothing happen:

```bash
tail -f app.log | grep ERROR
```

The errors are in the file. `grep ERROR app.log` finds them. But live, the terminal stays empty for a long while, then dumps a block of lines at once. Nothing is broken. Your output went into a buffer, and the buffer is not full yet.

## Two modes, and the C library picks

When a program writes to standard output, the C library decides how to batch those writes:

- **line buffered** when stdout is a terminal, so you see each line as it is produced,
- **block buffered** when stdout is anything else, and it waits until it has a full buffer's worth before writing.

The choice is made on what stdout is attached to, not on what you meant. Alone in a terminal, `grep` is line buffered. Put a pipe after it and the same `grep` switches to blocks, because that is faster for the common case of piping into a file.

The consequence is the one that confuses everyone: **adding a pipe changes the behaviour of the command before it.**

## Measuring it

Rather than argue about it, here is the effect, timed. The producer emits one line every 0.5 s, and `ts -i` from [moreutils](/posts/2025-07-30-moreutils/) stamps how long each line took to arrive:

```bash
$ (for i in 1 2 3 4; do echo "line $i"; sleep 0.5; done) | grep line | ts -i '%.s'
2.009094 line 1
0.000214 line 2
0.000040 line 3
0.000022 line 4
```

Two seconds of silence, then all four lines within a fraction of a millisecond. `grep` held everything until its input closed. That is the bug you were chasing, and it is not in your code.

## stdbuf

[`stdbuf`](https://www.gnu.org/software/coreutils/manual/html_node/stdbuf-invocation.html) runs a command with a different buffering mode, by preloading a small library that changes the defaults before `main` starts:

```bash
$ (for i in 1 2 3 4; do echo "line $i"; sleep 0.5; done) | stdbuf -oL grep line | ts -i '%.s'
0.000006 line 1
0.487687 line 2
0.507754 line 3
0.507074 line 4
```

Lines now arrive as they are produced. `-oL` means line buffered on stdout, `-o0` unbuffered, and `-eL`/`-e0` do the same for stderr.

Good news for the cross-platform case: macOS ships `stdbuf` in `/usr/bin`, and it works the same way. The buffering problem itself is identical there, with the system `grep`:

```bash
$ (for i in 1 2 3 4; do echo "line $i"; sleep 0.5; done) | /usr/bin/grep line | cat
46.317060000 line 1
46.325222000 line 2
46.330607000 line 3
46.334794000 line 4
```

Four lines in 17 milliseconds, after two seconds of nothing. Same story, BSD grep 2.6.0 included.

A detail that cost me a minute: if your `grep` is not the system one, the result changes. I had [ugrep](https://ugrep.com) first in my `PATH`, and it is line buffered by default, so the problem did not reproduce at all until I called `/usr/bin/grep` explicitly.

## Prefer the native flag when there is one

`stdbuf` is the general answer, but several tools already know about this and their own flag is more reliable:

```bash
tail -f app.log | grep --line-buffered ERROR
tail -f app.log | sed -u 's/x/y/'
tail -f app.log | jq --unbuffered .
```

`grep --line-buffered` gave me timings identical to `stdbuf -oL`, to the millisecond.

## Where stdbuf gives up

`stdbuf` only changes what the C library does by default. A program that manages its own buffering ignores it entirely, and `awk` is the example that will bite you:

```bash
$ (for i in 1 2 3; do echo "l$i"; sleep 0.4; done) | stdbuf -oL awk '{print}' | ts -i '%.s'
1.202923 l1
0.000240 l2
0.000038 l3
```

Still batched. Worse, the usual advice of calling `fflush()` does not save you on Ubuntu, because the default `awk` there is `mawk`, and `mawk` buffers its *input*: it has not read your line yet, so there is nothing to flush. Two things actually work, and they differ per implementation:

```bash
mawk -Winteractive '{print}'     # mawk: line buffered i/o
gawk '{print; fflush()}'         # gawk: flush after each line
```

I checked all four combinations. `gawk` with `fflush()` streams, `gawk` without it does not. `mawk` with `-Winteractive` streams, `mawk` with `fflush()` does not. So the answer to "why is my pipeline silent" depends on which `awk` your distribution installed. A fine reason to name the one you mean in a script.
