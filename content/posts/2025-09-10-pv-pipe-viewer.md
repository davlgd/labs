---
author: davlgd
pubDatetime: 2025-09-10T13:37:00Z
title: "pv: put a progress bar on any pipe"
description: "Watching bytes go by"
tags:
  - Shell
  - Tools
ogImage: /images/2025-09-pv-progress-pipe.webp
---

You start a `tar` over a few gigabytes, or restore a database dump, and the terminal goes quiet. Is it working? Is it stuck? Will it take a minute or an hour? The command has no idea it should tell you, and most of them never will. `pv`, for Pipe Viewer, adds the missing display to anything that moves bytes.

## A meter you drop into the pipe

`pv` copies standard input to standard output, unchanged, and reports on standard error what went through:

```bash
$ pv big.bin > /dev/null
2.86MiB 0:00:00 [5.38GiB/s] [================================>] 100%
```

Five things at a glance: how much passed, how long it took, the current rate, a bar, and the percentage. Because it only touches stderr, the data itself is untouched and you can put it anywhere in a pipeline:

```bash
pv backup.sql | mysql mydb
tar czf - /var/www | pv | ssh server 'cat > site.tgz'
```

The second one is my favourite shape: you get a live rate for a transfer that would otherwise be a black box.

## When it cannot know the size

Give `pv` a filename and it stats the file, so it knows the total and can show a percentage. Put it in the middle of a pipe and it has no idea what is coming:

```bash
$ cat big.bin | pv > /dev/null
2.86MiB 0:00:00 [ 476MiB/s] [<=>                                               ]
```

Volume and rate are still there, but the bar has become a `<=>` marker bouncing left to right, and there is no percentage: it cannot compute one without knowing the total. If you know it, pass it with `-s`:

```bash
$ cat big.bin | pv -s 3000000 > /dev/null
2.86MiB 0:00:00 [2.07GiB/s] [================================>] 100%
```

The percentage comes back. In a script, `-s $(stat -c%s file)` on Linux or `-s $(stat -f%z file)` on macOS gets it for you.

## Throttling, the underrated part

`-L` caps the rate. This turns `pv` from a display into a traffic shaper:

```bash
$ pv -L 500k small.bin > /dev/null
 500KiB 0:00:01 [ 461KiB/s] [===============>                 ]  51% ETA 0:00:01
 976KiB 0:00:01 [ 491KiB/s] [================================>] 100%
```

A megabyte held at 491 KiB/s instead of the 476 MiB/s the same machine does unthrottled. A factor of a thousand, on request.

That matters when you are copying to a NAS over a link you share with other people, or restoring a dump on a live database and you would rather not saturate the disk. Slowing a job down on purpose is a real tool, and this is the shortest way to do it.

## The detail that confuses everyone

Run `pv` in a script and redirect its output, and the bar vanishes. That is deliberate: `pv` checks whether stderr is a terminal, and stays quiet when it is not, so it does not pollute your logs with thousands of redraw lines.

When you do want the output anyway, `-f` forces it:

```bash
pv -f big.bin > /dev/null 2> progress.log
```

Every example in this post was captured that way, the only reason I can paste real bars here instead of describing them.

## Getting it

`pv` is not in coreutils and not on macOS:

```bash
sudo apt install pv     # Debian, Ubuntu
brew install pv         # macOS
```

Version 1.10.3 is what shipped on my Ubuntu test box.

Two caveats. `pv` measures bytes, not work: a compressed stream shows the compressed rate, so `pv` before `gzip` and `pv` after it report different numbers, and neither is wrong.

And it adds a process to the pipeline, so on a very fast local copy you are measuring the pipe as much as the source. For anything network or disk bound, when you actually care, the cost disappears in the noise.
