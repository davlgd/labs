---
author: davlgd
pubDatetime: 2025-10-22T13:37:00Z
title: "flock: stopping a cron job from running twice"
description: "Overlap is the bug you never see"
tags:
  - Shell
  - Linux
  - Tools
ogImage: /images/2025-10-flock-lock-cron.webp
---

You schedule a backup every five minutes. One day the backup takes six. Now two copies run at once, both writing the same file, and the result is a corrupted archive nobody notices until the day it's needed. Cron will happily start a job whose previous run has not finished, and it will never tell you.

## What overlap looks like

Two instances of the same tiny job, started together, writing to the same file:

```bash
$ for i in 1 2; do
    ( echo "start-$i" >> out.txt; sleep 1; echo "end-$i" >> out.txt ) &
  done; wait

$ cat out.txt
start-1
start-2
end-1
end-2
```

Both started before either finished. With real work in the middle, that is two processes in the same directory, on the same temporary files, at the same time.

## flock, one word in front

[`flock`](https://man7.org/linux/man-pages/man1/flock.1.html) takes a lock on a file and runs your command while holding it. Anyone else asking for the same lock waits their turn:

```bash
$ for i in 1 2; do
    ( flock /tmp/lock -c "echo start-$i >> out.txt; sleep 1; echo end-$i >> out.txt" ) &
  done; wait

$ cat out.txt
start-1
end-1
start-2
end-2
```

Fully serialised. The second run waited for the first to release, then went. Same script, one word added.

The lock lives on a file, but it is not *in* the file: nothing is written to it, and its contents are irrelevant. It exists to be something both processes can point at.

The kernel releases the lock when the process holding it exits, including when it crashes, the important part. A hand-rolled "create a PID file, delete it at the end" gets this wrong every time the job is killed.

## Wait, or give up

Waiting is not always what you want. A backup that is still running probably should not queue another one behind it. `-n` fails instead of blocking:

```bash
$ flock -n /tmp/lock -c "echo NEVER"

$ echo $?
1
```

Nothing ran, and you get exit code 1 to act on. When you would rather wait, but not forever, `-w` caps it:

```bash
$ flock -w 3 /tmp/lock -c "echo acquired"
acquired
```

That waited a second for the other job to finish, then took the lock and returned 0. When the wait runs out, you get the same code as `-n`:

```bash
$ flock -w 2 /tmp/lock -c "echo NEVER"

$ echo $?
1
```

Two seconds, nothing run, exit 1.

## The line you actually write

In a crontab, this is the whole point:

```cron
*/5 * * * * /usr/bin/flock -n /var/lock/backup.lock /usr/local/bin/backup.sh
```

If the previous backup is still going, this run exits immediately and quietly. No overlap, no PID file, no cleanup logic. Combine it with `chronic` from [moreutils](/posts/2025-07-30-moreutils/) and you have a cron job that is silent when things are fine, loud when they are not, and never runs twice.

## macOS does not have it

```bash
$ ls /usr/bin/flock
ls: /usr/bin/flock: No such file or directory
```

`flock` comes from util-linux, and Apple does not ship it. Homebrew does, though:

```bash
brew install util-linux    # provides flock
```

Worth knowing that this is not true of every util-linux tool: the formula lists the ones it cannot build on macOS, and `taskset` is on that list while `flock` is not. So you can have `flock` on a Mac, you cannot have `taskset`.

Without Homebrew, macOS ships two relatives of its own, both in `/usr/bin`.

`lockf` is the closest match and works the same way:

```bash
$ lockf lk sh -c 'echo start >> out.txt; sleep 1; echo end >> out.txt'
```

Two of those serialise properly, as I checked. The flag for "do not wait" is `-t 0` instead of `-n`, and the exit code is different:

```bash
$ lockf -t 0 lk echo NEVER
lockf: lk: already locked

$ echo $?
75
```

75, not 1. It is `EX_TEMPFAIL` from `sysexits.h`, more descriptive and completely incompatible with a script written against `flock`. If you check exit codes across both platforms, handle both values.

The other one is `shlock`, older and PID-based: it writes a PID into the lock file and checks whether that process still exists. It works, and it has the failure mode `flock` was designed to avoid, since a PID can be reused. Prefer `lockf` when you have the choice.
