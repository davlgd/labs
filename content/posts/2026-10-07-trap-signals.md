---
author: davlgd
pubDatetime: 2026-10-07T13:37:00Z
title: "trap: cleaning up after a script, whatever kills it"
description: "Every exit, almost"
tags:
  - Shell
  - Tools
ogImage: /images/2026-10-trap-signals.webp
---

In the [mktemp post](/posts/2026-08-12-mktemp-install/), I wrote that `trap ... EXIT` runs on every exit: "success, failure, `set -e` aborting, or a signal". My script started with `#!/bin/bash`, my sentence did not. I ran the same pattern with other shells, and the last word turned out to be wrong.

## Three shells, one script

Here is `clean.sh`, that pattern under `#!/bin/sh`, with a `sleep` to leave time to kill it:

```sh
#!/bin/sh
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
echo "working in $tmp"
sleep 30
```

And `check.sh`, to run it with several shells and see what each one leaves behind:

```sh
#!/bin/sh
# run a script with each shell, send it SIGTERM, see what is left behind
script=$1; shift
for shell in "$@"; do
  $shell "$script" > out.txt &
  sleep 1
  kill $!
  wait $! 2>/dev/null
  dir=$(cut -d' ' -f3 out.txt)
  [ -n "$dir" ] || { echo "$shell: did not start"; continue; }
  if [ -d "$dir" ]; then echo "$shell: left $dir"; else echo "$shell: cleaned up"; fi
done
```

For each shell, it starts the script in the background and waits a second. `kill` then sends `SIGTERM` to `$!`, the last background process, and `wait` lets it finish. The directory name is the third word the script printed. On Debian 13, with zsh installed:

```bash
$ sh check.sh clean.sh bash dash zsh
bash: cleaned up
dash: left /tmp/tmp.kC71esedjA
zsh: left /tmp/tmp.Zmp024oeNr
```

Only bash runs the `EXIT` trap when `SIGTERM` kills it. `Ctrl-C` sends `SIGINT`, with the same split. BusyBox `sh` on Alpine leaves the directory too, and zsh only cleans up on `SIGHUP`.

Now look at what `/bin/sh` is. On macOS it is bash, so `sh check.sh clean.sh sh` answers "cleaned up" on a Mac. On Debian and Ubuntu it is dash, on Alpine BusyBox. The same `#!/bin/sh` script is tidy on a laptop and leaks on every interrupted run in production.

## EXIT is about exiting

Nobody is wrong here. [POSIX](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html) says the `EXIT` trap shall run when the shell exits normally, and may run when a signal terminates it. Bash takes the "may", dash never, zsh for `SIGHUP` only.

So the portable answer is to handle the signals, and turn each one into a regular exit:

```sh
#!/bin/sh
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
echo "working in $tmp"
sleep 30
```

Three more lines, saved as `portable.sh`, and the three shells agree. The check now takes 90 seconds, the next section says why:

```bash
$ sh check.sh portable.sh bash dash zsh
bash: cleaned up
dash: cleaned up
zsh: cleaned up
```

The codes follow a convention: a shell reports 128 plus the signal number for a command killed by a signal, so 129 for `SIGHUP` (1), 130 for `SIGINT` (2) and 143 for `SIGTERM` (15). A caller reading `$?` sees the value it would have seen without the trap.

## A trap waits its turn

There is a catch in that version. A shell does not run a trap while it waits for a foreground command, so the signal has to wait for `sleep` to finish:

```bash
# start it, send SIGTERM after one second, time how long it takes to stop
$ sh portable.sh > /dev/null & sleep 1; kill $!; time wait $!

real	0m29.004s
user	0m0.002s
sys	0m0.003s
```

`SIGTERM` came after one second and the script took the 29 remaining ones to react. At a terminal you never notice: `Ctrl-C` goes to the whole foreground group, `sleep` included.

A `kill` signals the shell alone, and so does a container runtime stopping a shell that runs as PID 1. It waits a few seconds, runs out of patience and sends `SIGKILL`.

The fix is to put the long command in the background and `wait` for it, because `wait` returns as soon as a trapped signal arrives:

```sh
sleep 30 &
wait $!
```

Saved as `fast.sh`, with those two lines in place of the `sleep`:

```bash
$ sh fast.sh > /dev/null & sleep 1; kill $!; time wait $!

real	0m0.002s
user	0m0.001s
sys	0m0.003s
```

The script is gone at once, but its `sleep 30` is still running, orphaned. Even `Ctrl-C` spares it now, since a script's background job ignores `SIGINT`. If the child must die with its parent, the trap has to `kill` it too.

## What trap can't catch

`SIGKILL` and `SIGSTOP` never reach the process, so there is nothing to trap. The three shells accept `trap true KILL` without a word, and it changes nothing. With `clean.sh`:

```bash
# SIGKILL after one second, then look for the directory
$ sh clean.sh > out.txt & sleep 1; kill -KILL $!; sleep 1; ls -d $(cut -d" " -f3 out.txt)
/tmp/tmp.EtH03WngzZ
```

No cleanup survives a `kill -9`, a power cut or an out-of-memory kill. What is left then waits for the system to clean `/tmp`, at the next boot on most setups.

One more limit, on the caller's side. With `exit 130`, the script exits normally: it was not killed by the signal. Bash checks that difference, and a loop calling `portable.sh` goes on to the next iteration after a `Ctrl-C`. When that matters, clean up and send yourself the signal:

```sh
trap 'rm -rf "$tmp"; trap - INT EXIT; kill -INT $$' INT
```

`trap - INT EXIT` puts the default handlers back. The `kill` that follows then ends the script for real, and the cleanup does not run twice.

As for my sentence in the mktemp post, it needs four more words: every exit, *if you use bash*.
