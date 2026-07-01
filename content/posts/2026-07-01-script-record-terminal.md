---
author: davlgd
pubDatetime: 2026-07-01T13:37:00Z
title: "script: record and replay your terminal"
description: "A session you can play back"
tags:
  - Shell
  - Tools
ogImage: /images/2026-07-script-record-terminal.webp
---

Copying a terminal session into a bug report loses everything: the colours, the order, the pauses, and the half of the output you did not select. `script` records the session itself, and its companion plays it back at the speed it happened.

## Recording

The simplest form wraps a command and writes everything to a file:

```bash
$ script -q -c "echo bonjour; date +%Y" sess.log

$ cat sess.log
Script started on 2026-08-31 11:53:28+00:00 [COMMAND="echo bonjour; date +%Y" <not executed on terminal>]
bonjour
2026

Script done on 2026-08-31 11:53:28+00:00 [COMMAND_EXIT_CODE="0"]
```

`-q` suppresses `script`'s own chatter, `-c` gives it a command instead of an interactive shell. Note what the header and footer carry: the exact command, a timestamp, and the exit code. That is a lot of context you did not have to remember to include.

Without `-c` it starts a shell and records until you exit, the form for "reproduce the bug while I watch".

## Replaying, with the original timing

The interesting part needs a second file. `-T` records how long each chunk took:

```bash
$ script -q -T timing.log -c "echo un; sleep 1; echo deux" sess2.log

$ ls -l timing.log sess2.log
187 sess2.log
 22 timing.log
```

Twenty-two bytes of timing beside the transcript. Then `scriptreplay` plays it:

```bash
$ scriptreplay timing.log sess2.log
un
deux
```

You cannot see it in a paste, but `deux` arrives a second after `un`, exactly as it did during recording. A build that hangs for forty seconds hangs for forty seconds on replay. That is precisely the information a transcript throws away.

Note the argument order: `scriptreplay <timingfile> <typescript>`. Passing them the other way round gives `cannot open typescript`, which is how I learned it.

## What it is good for

Demonstrations, mostly. A recorded session replays at real speed with no risk of a typo, and it is a text file, so it diffs and it goes in a repository.

Then there is the awkward-question case: recording an incident while you work through it, so the postmortem has what you actually typed instead of what you remember typing. `script -q -T timing.log incident.log` at the start of the session costs nothing.

It is also the honest way to capture output that a plain redirect mangles. `script` allocates a pseudo-terminal, so programs that check `isatty()` behave as they would for a human: they keep their colours, their progress bars and their line buffering. That makes it a general workaround for the [buffering problem](/posts/2025-08-13-stdbuf-buffering/), and it is why `script -qec` shows up in CI configs.

## macOS is a different command

`script` exists there, and the similarity ends about there:

```bash
$ script -h
usage: script [-aeFkpqr] [-t time] [file [command ...]]
       script -p [-deq] [-T fmt] [file]
```

The command goes *after* the filename rather than behind a `-c`, so the Linux invocation fails outright. `scriptreplay` does not exist at all: BSD folds playback into `script -p`, which expects a file recorded with matching options, and I did not manage to get a round trip working in the time I gave it.

For anything cross-platform, record with `script` for the transcript and leave the timing to a tool built for it. [asciinema](https://asciinema.org/) does the same job with one CLI on both systems, and produces something you can embed in a page.

One last caveat, and it matters: `script` records **everything**, including what you type. A password entered during a recorded session is in that file in plain text. Check a transcript before you attach it to a ticket.
