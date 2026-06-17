---
author: davlgd
pubDatetime: 2026-06-17T13:37:00Z
title: "lsof: everything is a file, and here is the proof"
description: "Who is holding that open?"
tags:
  - Linux
  - Shell
  - Tools
ogImage: /images/2026-06-lsof-open-files.webp
---

"Everything is a file" is the line everyone quotes about UNIX and nobody demonstrates. `lsof` lists open files, and once you see what it counts as a file, the slogan stops being a slogan.

## Who is holding this open

The first use is the one you reach for when a filesystem will not unmount or a file will not delete:

```bash
$ sleep 300 > /tmp/held.log 2>&1 &

$ lsof /tmp/held.log
COMMAND  PID USER FD   TYPE DEVICE SIZE/OFF   NODE NAME
sleep   6817 root 1w   REG   0,81        0 167898 /tmp/held.log
sleep   6817 root 2w   REG   0,81        0 167898 /tmp/held.log
```

Two lines for one file, because the process holds two descriptors on it: `1w` is stdout and `2w` is stderr, both redirected there and both open for writing. The `FD` column is the useful one, and `w` versus `r` tells you which direction.

## The trick that solves a real emergency

Here is the situation. The disk is full. `du` says the directory is nearly empty. Nothing adds up.

```bash
$ rm -f /tmp/held.log

$ lsof | grep deleted
sleep 6817 root 1w REG 0,81 0 167898 /tmp/held.log (deleted)
```

The file is gone from the directory, and it is still there on disk, because a process has it open. UNIX only frees the blocks when the last descriptor closes. `du` walks directory entries and sees nothing, `df` counts blocks and sees a full disk, and both are telling the truth.

This is almost always a log file that was rotated while the writing process kept its old descriptor. `lsof | grep deleted` finds it in seconds, and restarting or `HUP`-ing that process gets the space back. Deleting harder does not.

## What a process has open

Point it at a PID and you get the other view:

```bash
$ lsof -p 1
COMMAND PID USER  FD      TYPE DEVICE SIZE/OFF    NODE NAME
tail      1 root cwd       DIR   0,81     4096  160641 /
tail      1 root rtd       DIR   0,81     4096  160641 /
tail      1 root txt       REG   0,81 11352352  146240 /usr/lib/cargo/bin/coreutils/tail
```

Those `FD` values are not numbers. `cwd` is the working directory, `rtd` the root directory, `txt` the executable itself. A directory is a file, the running binary is a file, and every shared library it loaded will be in the rest of that list.

That is the "everything is a file" claim, printed out. Sockets and [named pipes](/posts/2025-08-27-mkfifo-named-pipe/) show up in the same table, with `-i` narrowing to network connections:

```bash
lsof -i -P -n          # all network activity
lsof -i :443           # who is on port 443
```

`-P` keeps ports numeric and `-n` skips reverse DNS, which makes it faster and stops it hanging on a slow resolver.

## Useful combinations

```bash
lsof -u alice          # everything one user has open
lsof +D /var/log       # everything under a directory tree
lsof -c nginx          # everything a named command has open
```

`+D` is the one to remember when a mount point refuses to release. It recurses, so it is slow on a large tree, and `lsof /path` on the mount point itself is usually enough.

## On macOS

It is there, but in `/usr/sbin` rather than `/usr/bin`, so a script hardcoding the path will miss it:

```bash
$ command -v lsof
/usr/sbin/lsof
```

The version is also well behind: 4.91 on my Mac against 4.99.4 on Ubuntu. The basics behave identically, and I got the same output shape for `lsof <file>` on both.

Two caveats. Without `sudo` you only see your own processes, so an empty result means "nothing of yours" and not "nothing". And on a busy machine a bare `lsof` produces tens of thousands of lines, so always narrow it with a file, a PID, a user or `-i` before you look.
