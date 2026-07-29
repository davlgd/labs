---
author: davlgd
pubDatetime: 2026-07-29T13:37:00Z
title: "env: the shebang line, and why it breaks"
description: "One argument, two behaviours"
tags:
  - Shell
  - Tools
ogImage: /images/2026-07-env-shebang-line.webp
---

I promised this one [while writing about `expect`](/posts/2025-05-07-expect-command/), where a script ran on my Mac and failed on Linux because of its first line. The cause is worth a post of its own, and `env` does more than that line suggests anyway.

## What the shebang actually does

`#!` at the very start of an executable file tells the kernel which interpreter to run it with. The kernel reads that line, and executes the named program with your file as an argument. `#!/bin/bash script.sh`, effectively.

That means the path has to be exact, because the kernel does not search `$PATH`. `#!/usr/bin/python3` fails on a machine where Python lives elsewhere, which is most machines with a virtualenv, a Homebrew install or a version manager.

Hence the idiom:

```bash
#!/usr/bin/env python3
```

`env` *is* at a fixed path, and its job here is to look up `python3` in `$PATH` and exec it. One indirection, and the script becomes portable.

## Where it breaks

Add an argument and the two systems disagree. Same file, same content:

```bash
#!/usr/bin/env python3 -u
print(1)
```

On macOS it runs and prints `1`. On Ubuntu:

```bash
$ ./a.py
env: 'python3 -u': No such file or directory
env: use -[v]S to pass options in shebang lines
```

Linux passes everything after the interpreter path as a **single argument**, so `env` is looking for a program literally named `python3 -u`, space included. macOS splits it. Neither is wrong, the behaviour was never specified, and the error message tells you the fix:

```bash
#!/usr/bin/env -S python3 -u
```

`-S` splits the string itself. I checked it on both systems and both print `1`, so that is the portable spelling. It is a GNU coreutils extension that BSD picked up, so it is safe on anything current and will confuse a very old system.

The other option is to take no arguments at all, and set what you need inside the script. For Python, `-u` has an equivalent environment variable, and for most interpreters something similar exists.

## env is not only for shebangs

Three flags make it useful on the command line.

Setting a variable for one command, without touching your shell:

```bash
$ env GREETING=bonjour sh -c 'echo $GREETING'
bonjour
```

You can do that with `GREETING=bonjour cmd` in most shells, and `env` is the version that works everywhere, including where the command is not a simple name.

Removing one, which the assignment syntax cannot do:

```bash
$ export FOO=1

$ sh -c 'echo [$FOO]'
[1]

$ env -u FOO sh -c 'echo [$FOO]'
[]
```

And starting from nothing at all, with `-i`:

```bash
$ env -i sh -c 'env | wc -l'
1
```

One variable left. That is the flag for reproducing "it works on my machine": run the failing command under `env -i` and add variables back one at a time until it works. Whatever you added last is your answer.

Called with no arguments, `env` just prints the environment, which is the same as `printenv` and a slightly shorter thing to type.

## The takeaway

`#!/usr/bin/env prog` for portability, `#!/usr/bin/env -S prog --flag` when you need an argument, and never `#!/usr/bin/env prog --flag`, however well it works on the machine in front of you.

That last form is the trap, because it fails only when your script reaches someone else's system. Which is exactly when you are not there to fix it.
