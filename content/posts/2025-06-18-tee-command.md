---
author: davlgd
pubDatetime: 2025-06-18T13:37:00Z
title: "tee: writing to a file you are not allowed to write to"
description: "The pipe that forks"
tags:
  - Shell
  - Tools
ogImage: /images/2025-06-tee-pipe-fork.webp
---

Everyone meets this one eventually. You need to drop a line into a file under `/etc`, you remember to prefix with `sudo`, and the shell tells you no anyway:

```bash
$ sudo echo "net.ipv4.ip_forward=1" > /etc/demo.conf
bash: /etc/demo.conf: Permission denied
```

You used `sudo`. You still got `Permission denied`. The reason is worth understanding, because it explains a whole family of shell surprises.

## The redirection happens before sudo

`>` is not part of the command. It's the shell's own syntax, and the shell handles it first: it opens the target file, then forks and executes what's left. So the sequence is:

1. your shell, running as you, tries to open `/etc/demo.conf` for writing,
2. it fails, because you are not root,
3. `sudo` is never reached.

`sudo` would have elevated `echo`, which never needed the privilege. The thing that needed it was your shell. That's why `sudo command > file` fails while `sudo command` alone works.

## tee, the T-junction

[`tee`](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/tee.html) is named after the plumbing fitting. It reads standard input, writes it to standard output *and* to the files you name. Put it on the far side of the pipe and it becomes the process doing the writing, so `sudo` applies to the right thing:

```bash
$ echo "net.ipv4.ip_forward=1" | sudo tee /etc/demo.conf
net.ipv4.ip_forward=1

$ cat /etc/demo.conf
net.ipv4.ip_forward=1
```

Note that it echoed the line back: `tee` passes its input through, so it chains. Most of the time you don't want that on your terminal, so send stdout to the bin:

```bash
echo "second line" | sudo tee -a /etc/demo.conf > /dev/null
```

`-a` appends instead of truncating, the same distinction as `>>` versus `>`. Forgetting it is how people overwrite a config file they meant to extend.

## More than one output

The `sudo` trick is the famous use, but `tee` accepts several files at once, handy for keeping a log of something you are also watching:

```bash
# wc -l is only here to prove the line came out the other side
$ echo bonjour | tee /tmp/a /tmp/b | wc -l
1

$ cat /tmp/a /tmp/b
bonjour
bonjour
```

One input, two files on disk, and the stream still reaching `wc` at the end. This is the shape I use most: run a build, watch it scroll, and keep the full output for later.

```bash
make 2>&1 | tee build.log
```

`2>&1` matters there. `tee` only ever sees standard output, so without it your errors go straight to the terminal and never reach the log, exactly when you need them.

## Where it stops

Two limits worth keeping in mind.

`tee` writes as it reads, so a crash halfway through leaves a half-written file. If you are transforming a file in place, that is the wrong tool, and it produces the classic empty-file disaster that deserves its own post.

The other is that `tee -a` on a shared file is only atomic for small writes. Two processes appending long lines at once can interleave them. For real concurrent logging, let `syslog` or your init system handle it.

Small caveat on exit codes, since it bites in CI: in a pipeline, the shell reports the status of the *last* command, so `make | tee build.log` returns `tee`'s success even when `make` failed. Add `set -o pipefail` in `bash`, or read `${PIPESTATUS[0]}`, otherwise a red build looks green.
