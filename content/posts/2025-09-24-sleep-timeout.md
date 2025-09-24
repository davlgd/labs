---
author: davlgd
pubDatetime: 2025-09-24T13:37:00Z
title: "sleep and timeout: doing nothing, on purpose"
description: "Two ways to control the clock"
tags:
  - Shell
  - Tools
ogImage: /images/2025-09-sleep-timeout-clock.webp
---

`sleep` is usually the second command people learn, right after `echo`, and then they never think about it again. Its sibling `timeout` is the one that stops a script from hanging until the end of time, and far fewer people know it. Both deserve a closer look, because both do more than their reputation suggests.

## sleep accepts more than integers

The classic use is a whole number of seconds. It also takes decimals, on both macOS and Linux:

```bash
sleep 0.3
```

And suffixes, which many people believe are GNU-only. They are not:

```bash
sleep 30s     # seconds
sleep 5m      # minutes
sleep 2h      # hours
sleep 1d      # days
```

I checked on macOS, where `sleep 0.02m` really does wait 1.2 seconds. What it rejects is anything else:

```bash
$ sleep 1x
sleep: invalid time interval: 1x
```

The surprise is what happens with several arguments. Both implementations add them up:

```bash
$ /usr/bin/time -p sleep 0.5 0.5 0.5
real 1,51
```

1.5 seconds, not 0.5. Handy for `sleep 1h 30m`, and a trap if you meant to pass one duration and a stray argument slipped in.

Note that on macOS `sleep` lives in `/bin`, not `/usr/bin`, so a script hardcoding `/usr/bin/sleep` fails there with `no such file or directory`. Call it by name and let `PATH` do its job.

## timeout, and the exit codes that tell you what happened

`timeout` runs a command and kills it if it takes too long. That single sentence hides three different outcomes, and they are distinguishable:

```bash
$ timeout 5 echo ok
ok

$ echo $?
0
```

The command finished in time, so you get its own status. Now the interesting one:

```bash
$ timeout 1 sleep 5

$ echo $?
124
```

**124 means "I killed it"**. It is the whole reason `timeout` is scriptable: you can tell a timeout apart from a genuine failure of the command, which no `&` plus `kill` hand-rolled version gives you for free.

```bash
timeout 30 ./deploy.sh; rc=$?
if (( rc != 0 )); then
  (( rc == 124 )) && echo "deploy timed out" || echo "deploy failed (rc=$rc)"
fi
```

Capture the status into a variable on the line itself. I first wrote that block as `if ! timeout 30 ./deploy.sh; then [[ $? -eq 124 ]] ...` and it reports every timeout as a plain failure, because the `!` has already replaced `$?` with its own result by the time the branch runs.

If you would rather see the signal that killed it, `--preserve-status` reports that instead:

```bash
$ timeout --preserve-status 1 sleep 5

$ echo $?
143
```

143 is 128 + 15, meaning SIGTERM.

## When the command refuses to die

`timeout` sends SIGTERM, which a program is free to ignore. Then your timeout does not time anything out, which defeats the purpose. `-k` adds a hard deadline after the polite one:

```bash
$ timeout -k 1 1 bash -c 'trap "" TERM; sleep 10'

$ echo $?
137
```

That process explicitly ignores SIGTERM. After one second `timeout` asks nicely, after one more it sends SIGKILL, and 137 is 128 + 9. Nothing survives that. In any script that must not hang, `-k` is the difference between a timeout and a suggestion.

## The macOS gap

`sleep` is everywhere. `timeout` is not:

```bash
$ command -v timeout gtimeout
$
```

Nothing. It is a GNU coreutils tool, and macOS ships the BSD set. Homebrew's `coreutils` package installs it prefixed:

```bash
brew install coreutils    # then use gtimeout
```

Which means a script meant to run on both needs to pick the right name:

```bash
TIMEOUT=$(command -v timeout || command -v gtimeout)
"${TIMEOUT:?no timeout available}" 30 ./slow-thing
```

Not elegant, but honest, and it fails loudly on a machine where neither exists instead of silently running without a limit.

One last thing worth knowing: `timeout` limits wall-clock time, not CPU time. A process stuck waiting on the network and one burning a core both hit the same deadline. If you want to cap CPU specifically, that is `ulimit -t`, and a different story.
