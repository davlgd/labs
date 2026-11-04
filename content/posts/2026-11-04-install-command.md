---
author: davlgd
pubDatetime: 2026-11-04T13:37:00Z
title: "install: the cp that sets mode and owner in one go"
description: "Four commands in a trench coat"
tags:
  - Shell
  - Tools
ogImage: /images/2026-11-install-command.webp
---

Open any deployment script and you will find the same four lines: `mkdir -p`, `cp`, `chmod`, `chown`. Four commands, four chances to stop halfway and leave wrong permissions.

Yet there is a command doing all of it at once. The [BSD man page](https://man.freebsd.org/cgi/man.cgi?query=install&sektion=1) dates it to 4.2BSD, in 1983, it is what `make install` has been calling ever since, and its name is so plain that nobody thinks of typing it by hand: [`install`](https://www.gnu.org/software/coreutils/manual/html_node/install-invocation.html).

## One line instead of four

All of this runs as root, in a throwaway Debian 13 container:

```bash
$ printf 'port = 8080\n' > app.conf
$ install -D -m 640 -o nobody -g root app.conf /etc/demo/app.conf

$ stat -c '%a %U:%G %n' /etc/demo/app.conf
640 nobody:root /etc/demo/app.conf
```

`-D` creates the missing directories, `-m` sets the mode, `-o` and `-g` the owner and the group. `stat -c` shows the result: mode, owner, group and name.

GNU `install` creates the file as `600`, then sets the owner, then the mode. It is never readable by more people than it should be, and that matters for a file holding a password.

Nothing is kept from one run to the next. Install the same file again without `-o`, and it belongs to whoever runs the command.

Without `-m`, the default says a lot about what the tool was made for:

```bash
$ printf '#!/bin/sh\necho hello\n' > hello.sh
$ stat -c '%a %n' hello.sh
644 hello.sh

$ install hello.sh /usr/local/bin/hello

$ stat -c '%a %n' /usr/local/bin/hello
755 /usr/local/bin/hello
```

The script was not executable, its copy is. `install` assumes you are installing a program.

It makes directories too, with `-d`, and one surprise: the mode only applies to the last one. The parents get `755`, whatever you asked.

```bash
$ install -d -m 700 a/b/c

$ stat -c '%a %n' a a/b a/b/c
755 a
755 a/b
700 a/b/c
```

As a reminder, here is what the modes used so far allow:

- `600` the owner reads and writes, nobody else has access
- `640` the same, and the group can read
- `644` the owner reads and writes, everybody else reads
- `700` only the owner can enter the directory
- `755` the owner has every right, the others read and execute

## It replaces, cp overwrites

Try updating a program while it runs:

```bash
# a copy of sleep, started as a program named worker
$ cp /usr/bin/sleep worker
$ ./worker 60 &

# cp cannot write into a binary that is running
$ cp /usr/bin/sleep worker
cp: cannot create regular file 'worker': Text file busy

# the inode number of the file, before
$ stat -c '%i' worker
3809918

# install replaces the file
$ install /usr/bin/sleep worker

# and after: another number, so another file
$ stat -c '%i' worker
3812820
```

`cp` opens the existing file and writes into it, and Linux refuses that on a binary being executed. `install` removes the destination and creates a new file, so the inode number changes.

The running process keeps the old one until it exits, and the next start gets the new version. `-v` shows both steps, removal then copy:

```bash
$ install -v /usr/bin/sleep worker
removed 'worker'
'/usr/bin/sleep' -> 'worker'
```

That is why `install` succeeds on the day the service is running, where a scripted `cp` fails.

It is still not atomic. Between the two steps the destination is missing, then incomplete, for the time of the copy. When that matters, install under a temporary name in the same directory and `mv` it into place, the dance from the [mktemp post](/posts/2026-08-12-mktemp-install/).

## Keeping the old one

Two more flags are worth knowing. `-b` keeps a backup of what it replaces:

```bash
$ printf 'port = 9090\n' > new.conf
$ install -b -m 640 new.conf /etc/demo/app.conf

$ ls /etc/demo
app.conf
app.conf~

$ stat -c '%a %U:%G %n' /etc/demo/app.conf /etc/demo/app.conf~
640 root:root /etc/demo/app.conf
640 nobody:root /etc/demo/app.conf~
```

The backup is the old file under a new name, so it kept `nobody` as its owner. The new one went to `root`, as no `-o` was given this time.

And `-C` compares first, leaving the destination alone when nothing would change. A file's modification date tells whether it was rewritten, so `touch -d` sets it back to January 1st before running the test:

```bash
# set an old modification date on the installed file
$ touch -d '2026-01-01 00:00' /etc/demo/app.conf

# install the same content again, with -C
$ install -C -m 640 new.conf /etc/demo/app.conf

# still the old date: the file was not rewritten
$ stat -c '%y' /etc/demo/app.conf
2026-01-01 00:00:00.000000000 +0000
```

`%y` prints the modification time: still the old one, so the file was left alone. Without `-C`, the same command brings it to today, and any tool watching modification times, `make` to begin with, sees the difference.

"Nothing would change" covers the content, the mode and the owner: ask for another mode and GNU copies the file again, new date included.

## Three installs, one name

All of the above is GNU coreutils 9.7. The name is everywhere, the options are not. On macOS, `-D` exists and takes an argument, a prefix used for the install log. Here it eats `-m`, and `install` is left with three files to copy into a directory that does not exist:

```bash
# macOS
$ install -D -m 644 app.conf etc/demo/app.conf
install: target directory `etc/demo/app.conf' does not exist
```

There is no `-t` either, `-b` names its backup `app.conf.old`, and `stat` wants `-f` where GNU wants `-c`. "Text file busy" is a Linux answer too.

On Alpine, BusyBox knows `-D` and `-t`, not `-C`. It took `-b` silently, and made no backup.

The form that worked on all three is the boring one:

```bash
install -d demo2 && install -m 644 app.conf demo2/
```

Last limits. `install` copies files, not trees: there is no recursive option, so for a directory full of assets, `cp -a` or `rsync` keep their job. And since the destination is a new file each time, hard links to the old one are left behind.
