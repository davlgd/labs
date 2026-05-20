---
author: davlgd
pubDatetime: 2026-05-20T13:37:00Z
title: "shuf and split: cutting and shuffling files"
description: "Sampling and slicing, without a script"
tags:
  - Shell
  - Tools
ogImage: /images/2026-05-shuf-split-files.webp
---

Two jobs that people write scripts for: take a random sample of a file, and cut a big file into smaller ones. Coreutils does both, and the flags are worth ten minutes of your time.

## shuf, for randomness

The default is a full random permutation of the lines:

```bash
$ shuf n.txt | head -4
12
5
14
8
```

`-n` turns it into a sample, the form I use most. Twenty thousand log lines, show me three:

```bash
$ shuf -n 3 n.txt
20
4
16
```

It also generates without a file at all, with `-i`:

```bash
# five distinct numbers from 1 to 10
$ shuf -i 1-10 -n 5
4
9
6
2
5
```

That is a lottery draw in one command. For sampling *with* replacement, where a value can repeat, `-r`:

```bash
$ shuf -r -n 6 -i 1-3
1
2
3
1
3
1
```

And when you need randomness that reproduces, `--random-source` fixes the stream:

```bash
$ shuf --random-source=/dev/zero -n 5 n.txt
1
2
3
4
5
```

Same input and same source, same output every time. That is how you get a shuffled test fixture that a colleague can reproduce.

## sort -R is not the same thing

macOS has no `shuf`, and the advice you will find is to use `sort -R`. It is not equivalent, and the difference is easy to miss. Take a file with repeated lines:

```bash
$ cat dup.txt
a
b
a
c
a
b

$ sort -R dup.txt
b
b
a
a
a
c
```

Every `a` ended up next to every other `a`. `sort -R` sorts by a hash of each line, so identical lines hash identically and stay grouped. `shuf` on the same file scatters them properly:

```bash
$ shuf dup.txt | tr '\n' ' '
b c a a a b
```

On my Mac, three consecutive `sort -R` runs even returned the same order. If your data has duplicates, `sort -R` is not a shuffle, it is a grouping with the groups in random order. Install `coreutils` from Homebrew and use `gshuf`.

## split, for slicing

By lines, the common case:

```bash
$ split -l 7 n.txt part_
$ wc -l part_*
 7 part_aa
 7 part_ab
 6 part_ac
20 total
```

Twenty lines into sevens, with the remainder in the last file. The suffix defaults to two letters (`-a` changes it), so `aa` through `zz` gives 676 pieces before it needs more.

When you care about the *number* of pieces instead of their size, `-n`:

```bash
$ split -n 3 n.txt chunk_
$ ls chunk_*
chunk_aa  chunk_ab  chunk_ac
```

Three files, whatever their size. Useful for handing equal work to a fixed number of parallel workers.

The alphabetic suffixes sort badly and confuse everything downstream, so `-d` gives you numbers, and `--additional-suffix` keeps the extension:

```bash
$ split -l 7 -d --additional-suffix=.txt n.txt p_
$ ls p_*
p_00.txt  p_01.txt  p_02.txt
```

That combination is what I actually type: numbered, extensioned, and it feeds straight into `xargs -P` for parallel processing.

## Portability

`split` is on macOS and takes `-l`, `-n` and `-d`, all of which gave identical results to Linux in my tests. `--additional-suffix` is GNU only.

`shuf` is Linux only, and given what `sort -R` does with duplicates, it is worth installing instead of working around.

One caveat that applies to both: they hold what they need in memory. `shuf` reads the whole input before emitting anything, since it cannot know the last line might come first. On a file larger than your RAM, sample with `awk` and a probability instead.
