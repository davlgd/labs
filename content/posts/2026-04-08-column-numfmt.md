---
author: davlgd
pubDatetime: 2026-04-08T13:37:00Z
title: "column and numfmt: making shell output readable"
description: "Alignment, without the awk"
tags:
  - Shell
  - Tools
ogImage: /images/2026-04-column-readable-output.webp
---

Every script eventually prints a table, and every one of them prints it badly. Fields do not line up, byte counts run to ten digits, and somebody writes a `printf` with hardcoded widths that break on the first long value. Two commands fix both halves of that.

## column, for the alignment

Feed it ragged input, it works out the widths for you:

```bash
$ printf 'name size owner\nfoo.txt 1024 alice\nverylongname.md 20 bob\n' | column -t
name             size  owner
foo.txt          1024  alice
verylongname.md  20    bob
```

No widths given anywhere. `column -t` read every line first, found the longest value in each field and padded to match. That is exactly the loop nobody wants to write again.

The default separator is whitespace. For anything else, `-s`:

```bash
$ printf 'id,name,role\n1,alice,admin\n2,bob,user\n' | column -t -s,
id  name   role
1   alice  admin
2   bob    user
```

That single flag turns any CSV into something you can read, which beats opening it in a spreadsheet to look at four lines.

## It also speaks JSON

This one surprised me. The util-linux version can name the columns and emit structured output:

```bash
$ printf '1 alice\n2 bob\n' | column -J -N id,name
{
   "table": [
      {
         "id": "1",
         "name": "alice"
      },{
         "id": "2",
         "name": "bob"
      }
   ]
}
```

`-N` gives the field names, `-J` switches to JSON. So a text-only tool becomes a bridge into `jq` without writing a parser. `-N` works with `-t` too, adding a header row to the plain table.

## numfmt, for the numbers

Alignment does not help if the values are unreadable. `numfmt` converts to and from human scales:

```bash
$ echo 1234567 | numfmt --to=iec
1.2M

$ echo 1234567 | numfmt --to=si
1.3M
```

Two answers, both right. `iec` divides by 1024, `si` by 1000, and the fact that they disagree by a whole tenth at this size is precisely why the flag exists.

The flag that makes it useful in a pipeline is `--field`, which converts one column and leaves the rest alone:

```bash
$ du -sb /usr/bin | numfmt --field=1 --to=iec
58M	/usr/bin
```

It goes the other way too:

```bash
$ echo 2G | numfmt --from=iec
2147483648
```

Which is how you turn a config value into bytes you can do arithmetic on.

## What you get on macOS

`column` is there, and the basics work identically: `-t` and `-s` gave me byte-identical output. The rest does not exist:

```bash
$ printf '1 alice\n' | column -J -N id,name
column: illegal option -- J
usage: column [-tx] [-c columns] [-s sep] [file ...]
```

That usage line is the whole of BSD `column`: four options against util-linux's twenty-six. And `numfmt` is GNU coreutils, absent from macOS entirely, though Homebrew's `coreutils` provides it as `gnumfmt`.

So `column -t` is safe to use anywhere. `-J`, `-N` and every `numfmt` invocation are Linux-only, and a script that relies on them needs to say so.

One caveat on `column -t` before you pipe something large into it: it buffers the entire input before printing anything, because it cannot know the widths until it has seen the last line. Timing the arrival of each line makes it obvious:

```bash
$ ( echo "a 1"; sleep 2; echo "bb 22" ) | column -t | ts -i '%.s'
1.984377 a   1
0.000099 bb  22
```

Both lines land after the two second pause, together. On a stream that never ends, `column -t` prints nothing at all.
