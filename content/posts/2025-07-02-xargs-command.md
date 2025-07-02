---
author: davlgd
pubDatetime: 2025-07-02T13:37:00Z
title: "xargs: turning a text stream into arguments"
description: "Because not every command reads stdin"
tags:
  - Shell
  - Tools
ogImage: /images/2025-07-xargs-stream-arguments.webp
---

Pipes carry text into a program's standard input. That works beautifully for `grep`, `sort` or `wc`, and not at all for `rm`, `mkdir`, `kill` or `git`, which expect their targets as arguments. `xargs` is the adapter between them: it reads a stream and turns it into a command line.

## The gap it fills

```bash
$ echo /tmp/old.log | rm
rm: missing operand
Try 'rm --help' for more information.
```

`rm` never looked at the pipe. It wants arguments, found none, and said so.

`xargs` fixes the mismatch:

```bash
$ echo /tmp/old.log | xargs rm
```

It reads the words on standard input and appends them to the command you gave it. That's the whole idea, and everything else is about controlling how it batches them.

## The space that breaks everything

Here is the classic failure, reproduced on Ubuntu with two files, one of which has a space in its name:

```bash
$ ls
autre.txt  'mon fichier.txt'

$ ls | xargs rm
rm: cannot remove 'mon': No such file or directory
rm: cannot remove 'fichier.txt': No such file or directory
```

`xargs` splits on whitespace by default, so `mon fichier.txt` became two arguments. Worse than an error: if a file named `mon` had existed, it would have been deleted instead.

The fix is to change the separator to a byte that cannot appear in a filename, and the only such byte is the null one:

```bash
$ find . -name '*.txt' -print0 | xargs -0 rm
```

`find -print0` terminates each path with `\0`, and `xargs -0` splits on it. Whenever the input is filenames, this pair is the correct spelling. Not "safer": correct. The whitespace version is the one that happens to work when nothing is unusual.

## Batching, and placing the argument

By default `xargs` packs as many arguments as fit into one command line. `-n` caps it:

```bash
$ printf 'a\nb\nc\nd\n' | xargs -n2 echo run:
run: a b
run: c d
```

Two invocations instead of one. When the command needs the argument somewhere other than at the end, `-I` gives it a placeholder:

```bash
$ printf 'un\ndeux\n' | xargs -I{} echo "file [{}] processed"
file [un] processed
file [deux] processed
```

`-I` implies one argument per run. GNU tells you so if you combine it with `-n`:

```text
xargs: warning: options --max-args and --replace/-I/-i are mutually exclusive,
ignoring previous --max-args value
```

macOS accepts the same combination without a word, its own kind of unhelpful.

## Free parallelism

The flag I reach for most is `-P`, which runs several commands at once. Eight one-second sleeps, four at a time:

```bash
$ time (seq 1 8 | xargs -P4 -I{} sleep 1)
real	0m2.020s

$ time (seq 1 8 | xargs -P1 -I{} sleep 1)
real	0m8.062s
```

Four times the throughput for four characters of typing, on both macOS and Linux. For anything CPU-bound, `-P$(nproc)` turns a serial loop into a parallel one without writing a single line of job control. Keep in mind that the outputs interleave. If each job prints more than one line, you get them shuffled together, so redirect per job or accept the mess.

## The portability trap

This one deserves care, because it fails dangerously. Give `xargs` an empty input:

```bash
$ : | xargs echo "CALLED ANYWAY"
```

On macOS, nothing happens. On Ubuntu and Debian, it prints `CALLED ANYWAY`: GNU `xargs` runs the command once even with no arguments. So... a script that reads `find ... | xargs rm -rf` and finds nothing does nothing on your Mac, and runs `rm -rf` with no target on the server.

The portable answer is `-r`, short for `--no-run-if-empty`:

```bash
find . -name '*.tmp' -print0 | xargs -0 -r rm
```

Two flags for two separate problems, and they stack. `-0` is the one from earlier, protecting the filenames. `-r` protects the empty case. GNU changes its behaviour to match, and macOS accepts the flag without needing it, since not running is already what BSD does. The same line then behaves identically on both.
