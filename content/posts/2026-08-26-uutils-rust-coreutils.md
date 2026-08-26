---
author: davlgd
pubDatetime: 2026-08-26T13:37:00Z
title: "uutils: what a Rust coreutils changes for you"
description: "One binary, 114 commands"
tags:
  - Shell
  - Linux
  - Tools
ogImage: /images/2026-08-uutils-rust-coreutils.webp
---

I have spent a year of posts poking at small UNIX commands on three systems: macOS, Debian and Ubuntu. Along the way Ubuntu swapped its coreutils for a Rust reimplementation, first in 25.10 and now in the 26.04 LTS. So the last post in this run is about the thing that was quietly under all the others.

## What actually changed

[uutils](https://github.com/uutils/coreutils) is a from-scratch rewrite of coreutils in Rust, and Ubuntu made it the default. GNU is still installed, under a prefix:

```bash
$ readlink -f /usr/bin/ls
/usr/lib/cargo/bin/coreutils/ls

$ /usr/bin/ls --version | head -1
ls (uutils coreutils) 0.8.0

$ gnuls --version | head -1
ls (GNU coreutils) 9.7
```

Both are there, one command apart. That is a good decision: when something behaves oddly, you can compare against the reference implementation without installing anything.

## One binary wearing 114 hats

The packaging surprised me more than the language did:

```bash
$ ls -l /usr/lib/cargo/bin/coreutils/ | head -3
total 1264032
-rwxr-xr-x 115 root root 11352352 [
-rwxr-xr-x 115 root root 11352352 arch
```

Every entry is 11 MB, and the link count is 115. They are hard links to a single multi-call binary that decides what to do from `argv[0]`, the same trick BusyBox uses.

That matters when you compare sizes. Line up one command against its GNU twin and the result looks damning:

```bash
$ ls -l /usr/bin/gnuls /usr/lib/cargo/bin/coreutils/ls
  150568 /usr/bin/gnuls
11352352 /usr/lib/cargo/bin/coreutils/ls
```

Seventy-five times bigger. Except that 11 MB is paid once for all 114 commands, so the honest comparison is the whole set:

```bash
$ du -sh /usr/lib/cargo/bin/coreutils/
11M

$ du -ch /usr/bin/gnu* | tail -1
5.7M
```

Eleven megabytes against 5.7, for 114 commands against 104. Roughly double, which is a real cost and not the catastrophe the per-file number suggests.

## Does it behave the same?

This is the question that matters, and I have a year of accidental test cases to answer it with.

**It matched GNU everywhere I looked.** [`seq -s`](/posts/2026-03-25-seq-command/) produced byte-identical output including the trailing newline. [`factor`](/posts/2026-02-25-factor-primes/) agreed on every number I threw at it, including a 39-digit Mersenne prime. [`tr`](/posts/2026-05-06-tr-translate/) reproduced GNU's behaviour down to the surprises, including mapping `hello` to `world` as `wolld` and treating a UTF-8 `é` as two bytes.

Not "close enough": the same bytes.

The one difference I found was not a bug in either. Ubuntu's split between the two projects is not clean:

```bash
$ readlink -f /usr/bin/true
/usr/bin/gnutrue

$ readlink -f /usr/bin/false
/usr/lib/cargo/bin/coreutils/false
```

`true` is C, `false` is Rust, on the same machine. The two smallest programs on the system come from different projects, and their `--help` text differs accordingly. Nothing breaks, but it tells you the migration is per-command rather than wholesale.

## What you actually get

The pitch is memory safety, and it is a reasonable one for code that parses arguments and walks filesystems as root.

For a user, the visible benefits are smaller than the debate suggests. Better error messages in places, some commands faster and some slower, and a project that takes GNU compatibility seriously enough to run the GNU test suite against itself.

The visible risks are equally modest, and they are about the long tail. The common paths are well covered. An obscure flag combination, a locale edge case, a behaviour some script has depended on for twenty years: that is where a reimplementation earns its scars, and it is why keeping GNU one prefix away was the right call.

## What to do about it

Nothing, mostly. If you use these commands the way most people do, you will not notice.

Two things are worth the effort. When something behaves unexpectedly on Ubuntu, run the `gnu`-prefixed version before you blame your script, because that comparison takes five seconds and settles it. And in anything portable, do not assume which implementation you are on: after a year of testing across macOS, Debian and Ubuntu, the differences that actually bit me were BSD against GNU, not GNU against Rust.

That is the note to end this run of posts on. Every one of them found something I did not expect, and it was almost never in the command. It was in the gap between two implementations that both claim to do the same thing 😉
