---
author: davlgd
pubDatetime: 2026-02-25T13:37:00Z
title: "factor: your OS ships a prime factorization tool"
description: "In coreutils, of all places"
tags:
  - Shell
  - Tools
ogImage: /images/2026-02-factor-prime-numbers.webp
---

Coreutils is the package of file and text utilities: `ls`, `cat`, `wc`, `sort`. It also contains a program that does prime factorization, sitting between `expr` and `false` in the binary listing as though that were a normal thing for a file utility package to do.

```bash
$ factor 1234567890
1234567890: 2 3 3 5 3607 3803
```

Number in, prime factors out, repeated factors repeated. That is the entire interface.

## It is faster than it has any right to be

Trial division would take approximately forever on anything interesting, and `factor` is plainly not doing that. A semiprime built from two twelve-digit primes:

```bash
$ time factor 999999999950000000000429
999999999950000000000429: 999999999961 999999999989

real	0m0.017s
```

Seventeen milliseconds to split a 24-digit number into its two prime halves. Then there is the other direction, recognising that a number has no factors at all:

```bash
$ factor 2147483647
2147483647: 2147483647
```

A number that factors into only itself is prime, and this one is 2³¹ minus 1. It also handles values well past what a 64-bit integer can hold:

```bash
$ factor 170141183460469231731687303715884105727
170141183460469231731687303715884105727: 170141183460469231731687303715884105727
```

That is 2¹²⁷ minus 1, prime, answered instantly. Your shell cannot even represent that number.

## What it is actually good for

Not cryptography. A key is safe precisely because `factor` would need longer than the age of the universe on it, and the numbers above are easy ones.

Where it earns its place is the small stuff. Checking whether a number is prime is a grep away:

```bash
# prints the number only when it is prime
$ factor 97 | grep -qE ': [0-9]+$' && echo prime
prime
```

Picking a good hash table size, checking that a chosen shard count divides cleanly, working out why a buffer size behaves oddly, or answering a Project Euler question without writing any code:

```bash
$ factor 600851475143
600851475143: 71 839 1471 6857
```

That is problem 3, solved by typing.

## Refusals

It only accepts positive integers, and says so plainly:

```bash
$ factor abc
factor: 'abc' is not a valid positive integer
```

The one that catches people is negative numbers, because the argument parser sees the minus first:

```bash
$ factor -1
factor: invalid option -- '1'
```

Not "negative numbers have no prime factorization", but a complaint about an option that does not exist. Use `--` if you are passing something that might start with a dash.

## Not on macOS

```bash
$ command -v factor
$
```

`factor` is GNU coreutils, and macOS ships the BSD set. Homebrew's `coreutils` gives you `gfactor`, and both Debian and Ubuntu have it out of the box.

Worth noting on Ubuntu since 25.10, where the default coreutils are the Rust [uutils](https://github.com/uutils/coreutils) build: every number in this post produced identical output on the Rust and GNU versions, including the 39-digit one.
