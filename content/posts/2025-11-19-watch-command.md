---
author: davlgd
pubDatetime: 2025-11-19T13:37:00Z
title: "watch: the poor man's monitoring, in one command"
description: "Re-run it until something changes"
tags:
  - Shell
  - Tools
  - Monitoring
ogImage: /images/2025-11-watch-monitoring-loop.webp
---

Everyone has written this loop, in some form:

```bash
while true; do clear; df -h /var; sleep 2; done
```

Re-run a command, clear the screen, wait, repeat. It works, and `watch` does the same in eleven characters, plus a handful of things the loop cannot do at all.

```bash
watch df -h /var
```

## What you get for free

The default interval is two seconds, and `-n` changes it:

```bash
watch -n 1 df -h /var          # every second
watch -n 0.5 'ls -l | wc -l'   # twice a second
```

Note the quotes on the second one. `watch` passes the command to `sh -c`, so an unquoted pipe would be interpreted by *your* shell and only `ls -l` would be watched. Quote anything with a pipe, a redirection or a semicolon. If you would rather skip the shell entirely, `-x` execs the command directly.

The header shows the interval, the command and the host, which sounds cosmetic until you have four of these open and no idea which is which. `-t` removes it when you want the screen for the output.

The flag that changes how you use the tool is `-d`, which highlights what changed since the previous run:

```bash
watch -d -n 1 'ss -tn state established | wc -l'
```

Your eye stops scanning the whole screen and goes to the parts that moved. With `-d=permanent`, anything that has ever changed stays highlighted, so you can look away and still see what happened.

## The part nobody knows: it can stop on its own

`watch` is usually described as an infinite loop. A shame, because three flags turn it into a condition to wait for.

`-g` exits as soon as the output changes:

```bash
watch -g -n 5 'systemctl is-active myservice'
```

That blocks until the service state moves, then returns. It's a wait-for-it primitive without a polling script.

`-e` exits when the command itself fails:

```bash
$ timeout 5 watch -n 1 -e false

$ echo $?
1
```

It stopped on the first failure instead of running for the full five seconds. Handy to babysit something that should keep succeeding, and to know the moment it does not.

And `-q <cycles>` is the mirror image: exit when the output has *not* changed for that many cycles. Waiting for a queue to stabilise, or a file to stop growing, is a one-liner:

```bash
watch -q 3 -n 2 'ls -l big.iso | awk "{print \$5}"'
```

Three identical readings and it returns. I keep meeting scripts that reimplement this with a counter and a comparison.

## It really does need a terminal

`watch` draws with ncurses, so it wants a real terminal and says so when it does not have one:

```bash
$ watch -n 1 date
ncurses: cannot initialize terminal type ($TERM="unknown"); exiting
```

That is not a bug to work around, it's a design decision: the tool exists to redraw a screen. In a script or a CI job, the loop you were trying to replace is the right answer, or `-g`/`-q` if you only need the exit condition and can give it a `TERM`.

## Not on macOS

```bash
$ command -v watch
$
```

`watch` comes from procps-ng, the Linux process tools, version 4.0.4 on my Ubuntu 25.10 box. macOS ships none of that family:

```bash
brew install watch
```

Without Homebrew, the loop from the first paragraph is the fallback, and `clear` plus `sleep` gets you most of the way. What you lose is `-d`, the flag that actually makes `watch` worth installing.
