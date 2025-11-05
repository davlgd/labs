---
author: davlgd
pubDatetime: 2025-11-05T13:37:00Z
title: "nohup, disown and setsid: surviving the hangup"
description: "What dies when you close the terminal"
tags:
  - Shell
  - Linux
  - Tools
ogImage: /images/2025-11-nohup-detach-terminal.webp
---

You start a long job over SSH, the connection drops, and the job is gone. Everyone learns to prefix with `nohup` after that happens once. Fewer people know why it works, or that two other commands solve the same problem differently, and better in some cases.

## The signal behind it

When a terminal goes away, the kernel sends `SIGHUP` to the processes attached to it. The name is literally "hang up", from the days when the terminal was a modem and the line dropped. The default action for that signal is to die.

You can watch it happen without unplugging anything:

```bash
$ sleep 30 &

$ kill -HUP $!
bash: line 11:  4162 Hangup                     sleep 30
```

`Hangup`, and the process is gone. That is exactly what your job gets when the SSH session ends.

## nohup ignores it

[`nohup`](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/nohup.html) runs a command with `SIGHUP` set to ignore. Same test:

```bash
$ nohup sleep 30 >/dev/null 2>&1 &

$ kill -HUP $!

$ kill -0 $! && echo "still alive"
still alive
```

The signal arrives and does nothing. That is the whole mechanism, and it is why `nohup` has to be there from the start: you cannot decide after the fact.

The other half of what it does is about output. A detached job writing to a terminal that no longer exists is a problem, so `nohup` redirects standard output to `nohup.out` when stdout is a terminal. When it is not, it leaves your redirection alone:

```bash
$ nohup echo test1 > /tmp/explicit.txt

$ ls nohup.out
ls: cannot access 'nohup.out': No such file or directory
```

No stray file, because I gave it somewhere to write. This is why `nohup cmd > log 2>&1 &` is the form worth memorising: you choose where the output goes instead of discovering a `nohup.out` in whatever directory you happened to be in.

## disown, for the job you already started

`nohup` has to be decided in advance. `disown` is the fix when you forgot. It is a shell builtin, not a program, and it removes a job from the shell's job table:

```bash
$ sleep 30 &

$ jobs
[1]+  Running                 sleep 30 &

$ disown

$ jobs

$ pgrep -x sleep
4189
```

The job list is empty, the process is still running. Since the shell only sends `SIGHUP` to jobs it knows about, forgetting the job is enough to protect it.

Two consequences follow. You lose `fg`, `bg` and `wait` for that job, because the shell no longer tracks it. And the output still goes to the terminal, so `disown` alone will not save a job that writes to a screen that is about to disappear. Redirect first if you can.

## setsid goes further

`nohup` and `disown` both leave the process attached to the same session and the same controlling terminal. `setsid` starts it in a brand new session, where it is the leader and has no terminal at all:

```bash
$ setsid sleep 20 </dev/null >/dev/null 2>&1 &

$ ps -o pid=,ppid=,sid=,pgid=,comm= -p $(pgrep -x sleep)
   4170    4169    4170    4170 sleep
```

Look at the columns: PID 4170, and the session ID is also 4170. The process is its own session leader. Compare with a normal background job in the same shell:

```text
   4174    4169    4169    4169 sleep
```

There the session ID is 4169, the shell's. That process belongs to the shell's session and will hear about it when the session ends. The `setsid` one is genuinely elsewhere, and it is how daemons are traditionally started.

## What you get on macOS

`nohup` is there, in `/usr/bin`, and `disown` comes with your shell. `setsid` does not exist:

```bash
$ ls /usr/bin/setsid
ls: /usr/bin/setsid: No such file or directory
```

It comes from util-linux, which Apple does not ship, though `brew install util-linux` provides it.

For a real background service on a Mac the answer is not a detached process anyway, it is a `launchd` plist, which restarts it and handles logging. And on Linux, past a certain point, the same is true of `systemd`. These three commands are for the job you are running now, not for the service you want running next month.

The honest summary: `nohup` when you plan ahead, `disown` when you did not, `setsid` when you want the process to stop being yours. And `tmux` when you want to come back and look at it, and it is what I actually do most of the time.
