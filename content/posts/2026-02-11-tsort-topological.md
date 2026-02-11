---
author: davlgd
pubDatetime: 2026-02-11T13:37:00Z
title: "tsort: there is a topological sort in your coreutils"
description: "Version 7 UNIX, for building libraries"
tags:
  - Shell
  - Tools
ogImage: /images/2026-02-tsort-dependency-order.webp
---

Sorting a dependency graph is the kind of thing you write a script for, or pull in a library for. UNIX has shipped a command that does it since Version 7, and almost nobody knows it is there.

## Getting dressed

`tsort` reads pairs of words. Each pair means "this one comes before that one", and it prints an order that satisfies every pair:

```bash
$ printf 'shirt tie\ntie jacket\npants shoes\npants belt\nbelt jacket\nsocks shoes\n' | tsort
pants
shirt
socks
belt
tie
shoes
jacket
```

Six constraints in, one valid dressing order out. Shirt before tie, tie before jacket, and `tsort` worked out that socks and pants can happen in either order because nothing said otherwise.

That is the whole interface. No configuration, no format to learn: two words per line, in dependency order.

## The order is not unique, and that matters

Run the same input on macOS and you get a different answer:

```text
socks pants shirt belt shoes tie jacket
```

Both are correct. A topological sort produces *an* order consistent with the constraints, and there are usually many. GNU and the Rust reimplementation happened to agree on my test, macOS did not.

So do not diff `tsort` output across machines, and do not rely on the position of anything the constraints left free. If you need a deterministic result, pipe your pairs through `sort` first, and even then treat it as an implementation detail.

## Cycles are an error, with the loop printed

Circular dependencies are the reason you wanted the tool in the first place, and it names them:

```bash
$ printf 'a b\nb c\nc a\n' | tsort
b
c
a
tsort: -: input contains a loop:
tsort: a
tsort: b
tsort: c

$ echo $?
1
```

Exit status 1, the members of the cycle listed on stderr, and a best-effort ordering still on stdout. That is enough to build a real check: run it in CI over your module graph and let a non-zero status fail the build.

## Why it exists at all

The man page is candid about it: the command is "primarily intended for building libraries, where optimal ordering" of the archive members is what you are after.

Single-pass linkers of the era resolved symbols in the order object files appeared in an archive, so the order was not cosmetic, it decided whether your program linked. `tsort` computed it. The `HISTORY` section dates the command to Version 7 AT&T UNIX.

Modern linkers stopped caring decades ago, and the command stayed. That is how you end up with graph theory in a package of file utilities.

## What to use it for now

Anything shaped like "A must happen before B" and small enough to express as pairs. Ordering database migrations, checking a Makefile's prerequisites for cycles, sequencing service startup, sorting a list of pull requests that build on each other.

Generating the pairs is usually the real work, and it is a one-liner away:

```bash
# deps.txt: one line per item, its prerequisites after it
$ cat deps.txt
jacket tie belt
tie shirt
shoes pants socks
belt pants

# turn each line into pairs, then order them
$ awk '{ for (i = 2; i <= NF; i++) print $i, $1 }' deps.txt | tsort | tr '\n' ' '
pants shirt socks belt tie shoes jacket
```

Two caveats. `tsort` speaks whitespace-separated tokens, so anything with a space in it needs escaping or replacing first. And an item with no dependencies at all never appears, because `tsort` only knows what the pairs tell it. Feed it as a pair with itself, `item item`, and it shows up in the ordering.

It is on macOS, on Debian and on Ubuntu, in every case as part of coreutils. Nothing to install.
