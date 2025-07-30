---
author: davlgd
pubDatetime: 2025-07-30T13:37:00Z
title: "moreutils: the coreutils that never shipped"
description: "Fifteen tools you will want tomorrow"
tags:
  - Shell
  - Tools
ogImage: /images/2025-07-moreutils-toolbox.webp
---

Last week I wrote about [`sponge`](/posts/2025-07-16-sponge-command/), the tool that makes `sort file | sponge file` safe. `sponge` does not come from coreutils, it comes from [moreutils](https://joeyh.name/code/moreutils/), a package Joey Hess has been curating since 2006. Version 0.69 on Ubuntu installs fifteen commands, and several of them solve problems I used to write shell functions for.

```bash
sudo apt install moreutils    # Debian, Ubuntu
brew install moreutils        # macOS
```

Here are the ones I actually use.

## ts, for when things happened

`ts` prefixes every line of a stream with a timestamp. It's the fastest way to find out which step of a slow script is the slow one:

```bash
$ printf 'start\ndone\n' | ts '%H:%M:%.S'
23:40:41.898510 start
23:40:41.898560 done
```

The format is `strftime`, so you can print whatever you like. The flag that matters most is `-i`, which prints the time elapsed *since the previous line* instead of the clock:

```bash
$ (echo start; sleep 1; echo end) | ts -i '%.s'
0.000007 start
0.985476 end
```

Pipe a build log through `ts -i` and the offender stands out without any instrumentation.

## chronic, the cure for cron spam

Cron mails you everything a job prints. So a job that chats on stdout mails you every night, you add `> /dev/null`, and now you have silenced the error output you actually wanted. `chronic` fixes the logic: run the command, stay quiet if it succeeds, print everything if it fails.

```bash
$ chronic echo "you will not see this"
$ echo $?
0

$ chronic sh -c 'echo output; echo error >&2; exit 3'
output
error
$ echo $?
3
```

Both streams come back on failure, and the original exit code is preserved. A crontab line becomes `chronic /path/to/job`, and you hear from it when something is wrong.

## ifne, for empty streams

`ifne` runs a command only if standard input is not empty:

```bash
$ : | ifne echo "NOT CALLED"

$ echo x | ifne echo "CALLED"
CALLED
```

It pairs naturally with the [`xargs` empty-input trap](/posts/2025-07-02-xargs-command/): where `xargs -r` protects one command, `ifne` guards a whole pipeline. `find . -name '*.err' | ifne mail -s "errors found" me@example.com` sends nothing on a quiet day.

## errno, for the number in the log

You have `errno = 2` in a stack trace and no idea what it means:

```bash
$ errno 2
ENOENT 2 No such file or directory

$ errno ENOENT
ENOENT 2 No such file or directory
```

It works in both directions, and `errno -l` prints all 134 of them. Small, but it saves a search every time.

## pee, tee for commands

Where `tee` sends a stream to several files, `pee` sends it to several commands:

```bash
$ echo "bonjour" | pee "wc -c" "tr a-z A-Z"
BONJOUR
8
```

Note the order: the commands run in parallel, so their outputs arrive as they come, not in the order you wrote them. Fine when each command does its own thing and the order does not matter, useless when you need the outputs in a predictable one.

## vidir and vipe, editing in the middle

`vidir` opens a directory listing in your editor. Rename a line, the file is renamed. Delete a line, the file is deleted:

```bash
$ ls
a.txt  b.txt

$ EDITOR='sed -i s/a.txt/renamed.txt/' vidir .

$ ls
b.txt  renamed.txt
```

Bulk renaming with your editor's multi-cursor, and it beats any `rename` invocation I have written. `vipe` is the same idea for a pipe: it drops your editor between two commands so you can hand-edit the stream before it moves on. Worth knowing that it needs a real terminal, and fails with `reopen stdin: No such device or address` if you try it from a script.

## Two more worth a mention

`mispipe` pipes two commands but returns the exit status of the *first* one. That is what you wanted every time you reached for `pipefail`. And `combine` does set algebra on files with readable keywords:

```bash
$ cat x.txt        $ cat y.txt
a                  b
b                  c
c                  d

$ combine x.txt and y.txt     # b c
$ combine x.txt not y.txt     # a
$ combine x.txt xor y.txt     # a d
```

A whole class of `sort`/`comm` incantations replaced by a sentence. Watch out for `or`, which concatenates without deduplicating, so it gives `a b c b c d` rather than an union.

None of these will change your life on their own. Together they cover the gaps that make you write a 20-line helper script. Exactly what a good toolbox does.
