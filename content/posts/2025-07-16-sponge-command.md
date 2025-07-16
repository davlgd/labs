---
author: davlgd
pubDatetime: 2025-07-16T13:37:00Z
title: "sponge: why sort file > file empties your file"
description: "Truncated before it even began"
tags:
  - Shell
  - Tools
ogImage: /images/2025-07-sponge-pipe-buffer.webp
---

Sort a file in place. It looks like it should work, and it is the fastest way to lose data I know of:

```bash
$ printf 'banane\npomme\ncerise\n' > f.txt
$ sort f.txt > f.txt

$ wc -c < f.txt
0
```

Three lines in, zero bytes out. No error, no warning, no file.

## The shell opens the file first

The explanation is the same one behind [why `sudo command > file` fails](/posts/2025-06-18-tee-command/): redirection is the shell's job, and the shell does it before your command exists.

When you type `sort f.txt > f.txt`, the shell:

1. opens `f.txt` for writing, which truncates it to zero length,
2. forks and runs `sort f.txt`,
3. `sort` opens an empty file, reads nothing, writes nothing.

The truncation happens first, so `sort` never sees your data. The order is not a bug, it is how `>` has always worked: the shell sets up the file descriptors, then hands over.

## The workaround, and its cost

The reflex is a temporary file:

```bash
sort f.txt > tmp && mv tmp f.txt
```

It works, and it is what most scripts do. The cost shows up in the details: you need a name that will not collide, you leave `tmp` behind if the command fails halfway, and `mv` across filesystems is a copy, which changes the inode, the permissions and the ownership.

## sponge

[`sponge`](https://joeyh.name/code/moreutils/) reads its entire input before opening the output. That single difference makes the in-place pipeline safe:

```bash
$ printf 'banane\npomme\ncerise\n' > f.txt
$ sort f.txt | sponge f.txt

$ cat f.txt
banane
cerise
pomme
```

Same shape as the broken version, correct result. Because it soaks up all of stdin first, `sponge` also means the write happens in one go at the end, so a command that dies mid-stream leaves the original file untouched instead of half-rewritten.

It appends too:

```bash
$ echo datte | sponge -a f.txt

$ cat f.txt
banane
cerise
pomme
datte
```

The pattern generalises to any filter. That is where it earns its place:

```bash
grep -v '^#' config.ini | sponge config.ini
jq '.version = "2.0"' package.json | sponge package.json
```

That `jq` line is the one I use most, because `jq` has no in-place mode at all:

```bash
$ echo '{}' | jq -i .
jq: Unknown option -i
```

`sponge` is the shortest correct substitute.

## Getting it

`sponge` is not part of coreutils. It ships in [moreutils](https://joeyh.name/code/moreutils/), Joey Hess's collection of the tools that never made it into the standard set:

```bash
sudo apt install moreutils    # Debian, Ubuntu
brew install moreutils        # macOS
```

Nothing has it by default, macOS included, so a script that relies on it needs to say so.

## When not to use it

The buffering that makes `sponge` safe is also its limit: the entire input lives in memory before anything is written. On a multi-gigabyte file that is a problem, and the temporary-file dance is the better answer.

For the narrow case of editing a file with a stream editor, the tool already has it built in and you need neither:

```bash
sed -i 's/foo/bar/' file.txt
```

Note that `sed -i` wants an argument for the backup suffix on macOS (`sed -i '' ...`) and does not on Linux. Which is a portability trap of its own, and another story.
