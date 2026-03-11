---
author: davlgd
pubDatetime: 2026-03-11T13:37:00Z
title: "true and false: two commands that do nothing"
description: "And a copyright notice longer than the code"
tags:
  - Shell
  - Tools
ogImage: /images/2026-03-do-nothing-commands.webp
---

Your system ships two programs whose entire job is to fail, or to not fail. `true` exits with status 0, `false` exits with status 1. That's the whole specification. They have man pages, maintainers, and one of them has a copyright story that says a lot about the software industry.

## Three lines of nothing, copyrighted

In early UNIX, `/bin/true` was an empty file marked executable. Running an empty shell script does nothing and returns 0, exactly the contract. Free implementation.

Then the lawyers arrived. The [1984 AT&T version](https://trillian.mit.edu/~jc/humor/ATT_Copyright_true.html) of `true.sh` contained:

```sh
#     Copyright (c) 1984 AT&T
#       All Rights Reserved

#     THIS IS UNPUBLISHED PROPRIETARY SOURCE CODE OF AT&T
#     The copyright notice above does not evidence any
#     actual or intended publication of such source code.

#ident        "@(#)cmd/true.sh        50.1"
```

Seven lines of legal notice protecting zero lines of program. The file asserts that it is unpublished proprietary source code, while containing no source code. It remains one of my favourite artifacts in computing history.

## Where they actually live today

Nobody ships an empty script anymore. On my Mac:

```bash
$ ls -l /usr/bin/true
-rwxr-xr-x  1 root  wheel  84032 22 juil. 23:57 /usr/bin/true

$ file -b /usr/bin/true
Mach-O universal binary with 2 architectures
```

84 KB, compiled for both `x86_64` and `arm64e`, to return 0. Ubuntu 25.10 is stranger. It moved most of its coreutils to the Rust [uutils](https://github.com/uutils/coreutils) implementation and kept the GNU ones under a `gnu` prefix, and the split fell between the twins:

```bash
$ readlink -f /usr/bin/true
/usr/bin/gnutrue

$ readlink -f /usr/bin/false
/usr/lib/cargo/bin/coreutils/false

$ /usr/bin/true --version | head -1
true (GNU coreutils) 9.5

$ /usr/bin/false --version | head -1
/usr/bin/false (uutils coreutils) 0.2.2
```

`true` is C, `false` is Rust, on the same machine. I did not expect to find the two smallest programs on the system shipped by two different projects.

Except none of that usually runs. Your shell has its own:

```bash
$ type true
true is a shell builtin
```

The binary exists for the cases where a shell is not involved: a `find -exec`, an `execve` from a program, a `#!` line. The rest of the time, `true` never leaves the shell process.

## What they are for

The first one is the infinite loop, where `true` is the condition that never ends:

```bash
while true; do
  check_something
  sleep 60
done
```

The interesting one is neutralising a program you cannot remove. Point it at `true` and every call to it succeeds while doing nothing:

```bash
sudo ln -sf /usr/bin/true /usr/local/bin/annoying-hook
```

Then there's the third member of the family, and it is not a command at all. `:` is a shell builtin that does the same as `true`, in one character:

```bash
while :; do echo tick; sleep 1; done
```

It also works as a placeholder where the syntax demands a body but you have nothing to put there yet:

```bash
if [[ -n "${DEBUG:-}" ]]; then
  :   # nothing to do for now
else
  run_quietly
fi
```

And `false` earns its keep in tests. When you want to check that your error handling actually triggers, it's a guaranteed failure with no side effects, hard to get any other way.

Two caveats worth knowing. The first is that your shell uses its builtins, so changing `/usr/bin/true` will not change what `while true` does. If you need the binary, call it by path.

The second is that these two take their contract seriously, to the point of absurdity. Ask `false` for help, and the text warns you that asking changes nothing: "Any IO error during this operation is diagnosed, yet the program will also return 1." It means it:

```bash
$ /usr/bin/false --help > /dev/null

$ echo $?
1
```

macOS prints nothing at all for the same call, and exits 1 too. Either way you never get a 0 out of `false`.
