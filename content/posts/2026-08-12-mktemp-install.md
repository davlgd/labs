---
author: davlgd
pubDatetime: 2026-08-12T13:37:00Z
title: "mktemp: stop inventing your own temporary files"
description: "Two lines that make a script safe"
tags:
  - Shell
  - Tools
ogImage: /images/2026-08-mktemp-temporary-files.webp
---

Every shell script eventually needs somewhere to put something. The usual answer looks reasonable and has three separate problems:

```bash
tmp="/tmp/myapp.$$"
```

The name is predictable, since `$$` is just the PID. It collides, because PIDs are reused. And it is left behind on every path out of the script that is not the happy one.

That third problem is the one behind the temporary-file dance I described when [`sponge`](/posts/2025-07-16-sponge-command/) came up: write to `tmp`, then `mv` it into place, and hope nothing exits in between.

## mktemp does the whole job

```bash
$ mktemp
/tmp/tmp.NJNZmoAnih

$ mktemp -d
/tmp/tmp.M8TB94Q5qR
```

Random name, and the file or directory is **created atomically**. That is the part that matters: there is no window between "pick a name" and "create it" where somebody else can get there first, the race that turns a temporary file into a symlink attack.

The permissions are right by default too:

```bash
$ ls -l "$(mktemp)"
-rw-------

$ ls -ld "$(mktemp -d)"
drwx------
```

`0600` and `0700`. Owner only, no group, no world, without you having to remember a `chmod`.

## Cleaning up, properly

Creating it is half the job. This is the pattern worth memorising:

```bash
#!/bin/bash
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

echo "working in $tmp"
touch "$tmp/data"
```

`trap ... EXIT` runs on **every** exit: success, failure, `set -e` aborting, or a signal. I checked the failing case specifically, since that is the one people assume leaks:

```bash
$ bash fail.sh
created /tmp/tmp.52TglmlH79

$ echo $?
1

$ ls -d /tmp/tmp.* | wc -l
0
```

Exit code 1, directory gone. Nothing to clean up by hand tomorrow.

Note the single quotes around the trap command. With double quotes, `$tmp` expands when the trap is *installed* rather than when it fires, and if it were empty at that moment you would be running `rm -rf ""`. I made exactly that mistake writing this post, and my test left two directories behind instead of removing them.

## Naming it something you recognise

Random names are unhelpful when you are looking at `/tmp` wondering what left this there. A template fixes that, and the `X`es are where the randomness goes:

```bash
$ mktemp /tmp/demo.XXXXXX
/tmp/demo.XFmHa9
```

At least six `X`es, and they have to be at the end. `-t` does something similar with a prefix, and it puts the result in the system temporary directory rather than a path you chose.

## Where the files actually go

`mktemp` honours `TMPDIR`:

```bash
$ TMPDIR=/var/tmp mktemp
/var/tmp/tmp.3Kc5Y0jyWV
```

That is worth knowing because macOS sets it, to a per-user directory:

```bash
$ mktemp
/var/folders/f3/sjyq2d_10sl210w1x336yt080000gn/T/tmp.KAhZi1OzIv
```

Not `/tmp`. A script that assumes its temporary files are in `/tmp`, or that greps for them there, behaves differently on a Mac. Take the path `mktemp` gives you and never construct it yourself.

The distinction between the two locations matters too. `/tmp` is commonly cleared on reboot, `/var/tmp` is meant to survive it. For anything that should still be there after a crash, pass `TMPDIR=/var/tmp` deliberately.

## Portability

`mktemp` is on macOS, Debian and Ubuntu. The templates, `-d` and `TMPDIR` behaved identically everywhere I tested.

`-t` is the exception: on GNU it is deprecated and takes a template, on BSD it takes a bare prefix. If your script needs a prefix, give a full template with `X`es instead and the ambiguity disappears.
