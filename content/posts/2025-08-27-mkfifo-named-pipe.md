---
author: davlgd
pubDatetime: 2025-08-27T13:37:00Z
title: "mkfifo: a file that is actually a pipe"
description: "Zero bytes, and it carries everything"
tags:
  - Shell
  - Linux
  - Tools
ogImage: /images/2025-08-mkfifo-named-pipe.webp
---

The `|` you type between two commands creates a pipe that has no name and no existence outside that one command line. Both ends are born and die together. `mkfifo` gives you the same thing with a name on the filesystem, which changes what you can do with it.

## A file whose type is p

```bash
$ mkfifo pipe1

$ ls -l pipe1
prw-r--r-- 1 root root 0 Aug 31 00:21 pipe1
```

Look at the first character of the mode. Not `-` for a regular file, not `d` for a directory: `p`, for pipe. The tools agree:

```bash
$ stat -c 'type=%F size=%s' pipe1
type=fifo size=0

$ file pipe1
pipe1: fifo (named pipe)
```

It behaves the same on macOS, where `stat -f '%HT'` answers `Fifo File`. This is POSIX, so you get it everywhere.

## It blocks, and that is the point

Write to it with no reader, and your process stops:

```bash
$ ( echo "message" > pipe1 ) &

$ sleep 0.3; kill -0 $! && echo "writer still alive, blocked"
writer still alive, blocked

$ cat pipe1
message
```

The writer sits in `open()` until somebody opens the other end. This is not a limitation, it's the synchronisation mechanism: a FIFO connects two processes and makes them wait for each other, without a lock file or a polling loop.

## Nothing is ever stored

The size stays at zero, whatever goes through:

```bash
$ ( for i in 1 2 3; do echo "l$i"; done > pipe1 ) &

$ stat -c 'size=%s' pipe1
size=0

$ cat pipe1
l1
l2
l3
```

Three lines went through the file, and the file still holds nothing. The data lives in a kernel buffer between the two processes and never touches the disk. What the filesystem stores is the rendezvous point, not the content.

That has a practical consequence: streaming 40 GB through a FIFO costs no disk space, where a temporary file would cost 40 GB.

## What you gain over the plain pipe

The name is the whole difference. With `|`, both commands are on the same line, started by the same shell. With a FIFO, they can be anything, anywhere.

Two terminals, two processes that never knew about each other:

```bash
# terminal 1
mkfifo /tmp/sortme
sort < /tmp/sortme

# terminal 2
printf 'cerise\nbanane\npomme\n' > /tmp/sortme
```

Terminal 1 prints the sorted list. The two shells share nothing but a path.

It also survives its uses, which surprises people. A FIFO is not consumed after one exchange:

```bash
$ ( cat pipe1 & echo "first" > pipe1; wait )
first

$ ( cat pipe1 & echo "second" > pipe1; wait )
second
```

The same FIFO handled both, and it is still there afterwards. It disappears when you `rm` it, like any other file.

The classic real use is handing a stream to a program that insists on a filename instead of reading standard input. You give it the FIFO's path, and feed it from elsewhere.

Process substitution in `bash` (`<(command)`) solves the same problem, and it is worth knowing that it does *not* go through a FIFO when it can avoid it:

```bash
$ echo <(echo x)
/dev/fd/63

$ ls -l <(echo x)
lr-x------ 1 root root 64 /dev/fd/62 -> pipe:[8076713]
```

An anonymous pipe exposed under `/dev/fd`, not a named one. Bash falls back to real FIFOs only on systems without `/dev/fd`. So reach for `mkfifo` when you need the rendezvous to outlive a single command line, and for `<(...)` when you don't.

## What to watch out for

Three things bite.

A FIFO has no memory. If nobody is reading when you write, you block, and if nobody ever reads, you block forever. A script that opens one without a partner hangs with no error message, a miserable thing to debug.

Writing from several processes at once is only safe below `PIPE_BUF` bytes per write, 4096 on Linux. Above that, two writers can interleave inside a single line.

And a reader that goes away leaves the writer with `SIGPIPE`:

```bash
$ ( yes > p; echo "writer exit=$?" ) &

$ head -c 10 < p > /dev/null
writer exit=141
```

141 is 128 + 13, the shell's way of saying the process died on signal 13. Worth recognising in a log, because it usually means the consumer stopped early, not that the producer failed.

None of that makes FIFOs fragile, it makes them what they are: a pipe you can name, with a pipe's semantics and not a file's.
