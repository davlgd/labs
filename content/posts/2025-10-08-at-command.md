---
author: davlgd
pubDatetime: 2025-10-08T13:37:00Z
title: "at: scheduling a command to run once"
description: "Cron's forgotten cousin"
tags:
  - Shell
  - Linux
  - Tools
ogImage: /images/2025-10-at-scheduling-once.webp
---

Everybody reaches for `cron` when something needs to happen later. But `cron` answers a different question: it schedules things that repeat. When you want a command to run once, at four in the afternoon, and never again, the tool is `at`, and it has been sitting in your `PATH` this whole time.

## Once, not every

The interface is a pipe. You send it the command, you tell it when:

```bash
$ echo "date > /tmp/at-result.txt" | at now + 1 minute
warning: commands will be executed using /bin/sh
job 11 at Mon Aug 31 00:47:00 2026
```

A minute later, the file is there:

```bash
$ cat /tmp/at-result.txt
Mon Aug 31 00:47:00 UTC 2026
```

It ran at 00:47:00, on the second, and the queue is empty again. No crontab entry to remember to delete afterwards, the part people always forget.

Take that warning seriously: the job runs under `/bin/sh`, not your login shell. Any `bash` syntax you rely on is not available, and neither is your interactive environment.

## It reads almost like English

The time parser is the reason to enjoy this command. All of these are valid, and I checked what each one resolved to:

```text
now + 2 hours    -> Mon Aug 31 02:45:00
10:00            -> Mon Aug 31 10:00:00
10:00 tomorrow   -> Tue Sep  1 10:00:00
noon             -> Mon Aug 31 12:00:00
midnight         -> Tue Sep  1 00:00:00
teatime          -> Mon Aug 31 16:00:00
next week        -> Mon Sep  7 00:45:00
```

Yes, `teatime`. It is 16:00, it is in the spec, and it has been there for decades. UNIX was not written by people in a hurry to be serious.

Note that `midnight` means the *next* midnight, so a job sent at 00:45 lands 23 hours later, not in fifteen minutes. `now + 15 minutes` is what you meant.

## Looking at the queue

Three commands, the entire interface:

```bash
$ atq
11	Mon Aug 31 00:47:00 2026 a root

$ at -c 11        # print the job, environment included

$ atrm 11         # cancel it
```

`at -c` is the one worth knowing. It prints the whole script `at` saved, including a copy of every environment variable as it was when you submitted. That is how a job that worked in your terminal still works at 3am, and also how a stale `PATH` gets frozen into a job you wrote last week.

## The daemon nobody mentions

`at` only queues. Something else has to wake up and run the jobs: `atd`. If it is not running, your job sits in the queue forever and you get no warning at all:

```bash
sudo systemctl enable --now atd     # Debian, Ubuntu
```

macOS is the sharper trap. All four commands are there, in `/usr/bin`, and submitting a job **succeeds**:

```bash
$ echo "true" | at now + 1 minute
job 2 at Mon Aug 31 02:47:00 2026
```

Looks fine. But the daemon behind it ships switched off, and Apple says so in the file itself:

```bash
$ plutil -p /System/Library/LaunchDaemons/com.apple.atrun.plist
  "Disabled" => true
  "Label" => "com.apple.atrun"
```

So nothing ever executes. You have to load it yourself:

```bash
sudo launchctl load -w /System/Library/LaunchDaemons/com.apple.atrun.plist
```

A command that accepts your job, prints a confident job number, and then silently does nothing is a special kind of unhelpful. If you script around `at`, check that the daemon is alive rather than trusting the exit code.

## batch, for when the machine is busy

`batch` is `at` with a different trigger: instead of a time, it waits for the machine to be idle enough. The man page puts it as running "when the load average drops below 1.5 times number of active" CPUs, and `atd -l` lets you set your own limit.

```bash
$ echo "./heavy-job.sh" | batch
job 10 at Mon Aug 31 00:45:00 2026
```

In `atq` it shows up in queue `=` instead of `a`. That is how you tell the two apart. It's a nice fit for a rebuild or a backup you want done today, without competing with whatever the machine is doing right now.

Last thing: by default `at` mails you the job's output, which on a machine with no mail setup means the output disappears. Redirect to a file, as in the first example, and you keep it.
