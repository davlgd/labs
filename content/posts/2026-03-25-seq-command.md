---
author: davlgd
pubDatetime: 2026-03-25T13:37:00Z
title: "seq: the little generator that beats your for loop"
description: "Counting, with a catch"
tags:
  - Shell
  - Tools
ogImage: /images/2026-03-seq-counting-shell.webp
---

If [`yes`](/posts/2024-02-yes-command/) repeats, `seq` counts. It's the other half of the same idea: a tiny program whose only job is to produce a stream you pipe into something else. And like most tiny programs, it hides a few surprises once you cross an OS boundary.

## Why not brace expansion

Most of us reach for `{1..10}` first:

```bash
for i in {1..10}; do echo "$i"; done
```

It works in `bash` and `zsh`, and it's fast because the shell expands it without forking anything. But it's a shell extension, not POSIX, so it silently does nothing useful in `dash`, which is `/bin/sh` on Debian and Ubuntu:

```bash
$ dash -c 'for i in {1..3}; do echo "$i"; done'
{1..3}
```

One iteration, with the literal string. That's the kind of bug you discover in production. Brace expansion also refuses variables (`{1..$n}` does not expand), usually the moment people give up and call `seq`.

## Counting, three ways

```bash
seq 5           # 1 to 5
seq 2 6         # 2 to 6
seq 1 2 9       # from 1 to 9, step 2: 1 3 5 7 9
seq 3 -1 1      # backwards: 3 2 1
```

The middle argument is the increment, which trips people up: it's `seq first step last`, not `seq first last step`. Two useful flags:

```bash
$ seq -w 8 11        # pad with zeros to equal width
08
09
10
11

$ seq -f 'n=%g' 1 2  # printf-style format
n=1
n=2
```

Both work on macOS, Debian and Ubuntu, so you can rely on them.

## The separator that bites

`-s` sets what goes between the numbers, and this is where the implementations part ways. On Debian 13 with GNU coreutils 9.7:

```bash
$ seq -s, 1 5 | od -c
0000000   1   ,   2   ,   3   ,   4   ,   5  \n
```

Five numbers, four commas, one newline. The same command on macOS:

```bash
$ seq -s, 1 5 | od -c
0000000    1   ,   2   ,   3   ,   4   ,   5   ,
```

A trailing comma, and no newline at all. BSD `seq` treats `-s` as a terminator instead of a separator, so `seq -s, 1 5` gives you `1,2,3,4,5,` and leaves your cursor mid-line. If you were building a CSV row or a comma-separated argument list, you now have an empty trailing field on one platform and not the other.

The portable fix is to stop asking `seq` to do the joining:

```bash
seq 1 5 | paste -sd, -
```

`paste -sd,` joins the lines with a comma and gives the same result everywhere.

## Floats, and the same story again

`seq` handles decimals, genuinely useful for generating test data:

```bash
$ seq 0.5 0.5 2     # Debian and Ubuntu
0.5
1.0
1.5
2.0
```

macOS prints `0.5 1 1.5 2`: it trims the trailing zeros, where GNU keeps as many decimals as the operands had. Writing `seq 0.50 0.50 2` does not help, BSD still trims. Again, fine until you sort or compare the output as strings.

Worth noting for the Ubuntu case: since 25.10 the default `seq` is the Rust [uutils](https://github.com/uutils/coreutils) reimplementation, and on every one of these tests it matched GNU exactly, down to the byte. That compatibility work shows.

## When it earns its place

`seq` shines when the count is computed instead of written out:

```bash
# run process.sh once per line of input.txt, four at a time
n=$(wc -l < input.txt)
seq 1 "$n" | xargs -P4 -I{} ./process.sh {}
```

It's also the shortest way to generate a fixed-size file for a test, or to drive a retry loop. What it does not do is iterate over anything but numbers: for files, `find` and globs are the right tools, and piping `seq` into `ls` is a sign you took a wrong turn.
