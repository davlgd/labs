---
author: davlgd
pubDatetime: 2025-05-21T13:37:00Z
title: "dc: the calculator that is older than C"
description: "Reverse Polish, from the PDP-11"
tags:
  - Shell
  - Tools
ogImage: /images/2025-05-dc-rpn-calculator.webp
---

Most people who need arithmetic in a shell reach for `bc`. Almost nobody reaches for `dc`. A shame, because `dc` is what `bc` was originally built on top of, and it is very probably one of the oldest program still shipping with your system.

## Older than the language UNIX is written in

`dc` was written by Lorinda Cherry and Robert Morris at Bell Labs. It is the [oldest surviving UNIX language program](https://en.wikipedia.org/wiki/Dc_(computer_program)), written in **B**, and when Bell Labs got its PDP-11 it was the first language to run on the new machine, before there was even an assembler for it.

It predates C. The operating system it ships with was rewritten around it.

`bc` came later, also from Lorinda Cherry, as a friendlier front end: it took a C-like syntax, compiled it to `dc` notation and piped the result through `dc`. That plumbing is gone today. GNU `bc` is a standalone program, and running it under `strace` shows a single `execve`, its own.

## Everything is a stack

`dc` uses reverse Polish notation. You push values, then apply an operator to what is on the stack, and `p` prints the top:

```bash
$ echo "2 3 + p" | dc
5
```

No parentheses, ever, because the order is unambiguous. Nesting is just ordering:

```bash
# 5 + (3 * 2)
$ echo "5 3 2 * + p" | dc
11
```

That takes ten minutes to get used to and then becomes hard to give up.

## Arbitrary precision, with no ceremony

This is the reason to keep it around. `dc` has no integer size limit:

```bash
$ echo "2 200 ^ p" | dc
1606938044258990275541962092341162602522202993782792835301376
```

Two to the two hundredth, exact, in a program from 1970. Ask your shell for the same thing and its 64-bit integers give up without saying so:

```bash
$ echo $((2**200))
0
```

Not an error, not a warning. Zero.

Decimals need you to say how many you want, with `k`:

```bash
# 10 decimal places, then square root of 2
$ echo "10 k 2 v p" | dc
1.4142135623
```

`k` sets the precision, `v` is the square root. The default precision is 0, so without `k` you get integer division and a lot of confusion.

## Base conversion in two characters

`o` sets the output base, `i` the input base:

```bash
$ echo "16 o 255 p" | dc
FF

$ echo "2 o 10 p" | dc
1010
```

Hexadecimal and binary without `printf`, and it works for any base, not the three that `printf` knows.

## Where it lives

`dc` is on macOS out of the box. Debian and Ubuntu ship neither `dc` nor `bc` by default, so both need installing:

```bash
sudo apt install dc bc
```

The implementations differ, `dc 7.0.3` on my Mac against GNU's `1.4.1`, and every example in this post gave byte-identical output on both.

The honest limit is readability. `10 k 2 v p` is fast to type and impossible to review six months later. That is exactly why `bc` was written. Use `bc` when a human will read the expression again, and `dc` when you want a big number right now, or when you want to feel briefly like it is 1970.
