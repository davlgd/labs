---
author: davlgd
pubDatetime: 2026-05-06T13:37:00Z
title: "tr: the most underrated one-liner in your shell"
description: "Translate, squeeze, delete"
tags:
  - Shell
  - Tools
ogImage: /images/2026-05-tr-translate-characters.webp
---

`sed` gets used for jobs that `tr` does in a quarter of the characters, and usually faster, because `tr` does not parse a regular expression: it maps bytes. Knowing the four things it does covers a surprising share of daily text mangling.

## Translate

Two sets, same length, position by position:

```bash
$ echo "Hello World" | tr a-z A-Z
HELLO WORLD
```

Ranges work, and so does anything you can write out. ROT13 is famously one invocation:

```bash
$ echo "Hello" | tr 'A-Za-z' 'N-ZA-Mn-za-m'
Uryyb
```

## The trap that explains everything

This is where people get hurt, and understanding it makes the rest obvious:

```bash
$ echo "hello" | tr "hello" "world"
wolld
```

Not `world`. `tr` never saw a word, it built a character map: `h` to `w`, `e` to `o`, `l` to `r`, then `l` to `l` because the second `l` in the input set overrode the first, and `o` to `d`. Applying that map to `hello` gives `wolld`.

So `tr` is not find-and-replace. It substitutes one character for another, everywhere, and duplicate characters in the first set mean the last mapping wins. When you want strings, you want `sed`.

## Delete

`-d` drops the characters in the set instead of translating them, and the POSIX classes make it readable:

```bash
$ echo "Hello World 123" | tr -d '[:digit:]'
Hello World

$ printf 'a\x01b\x02c\n' | tr -d '[:cntrl:]'
abc
```

That second one is the fastest way I know to clean control characters out of a log before feeding it to something fragile. `[:alpha:]`, `[:space:]`, `[:punct:]` and friends all work.

The most common use in my shell is stripping carriage returns from a file that came off Windows:

```bash
$ printf 'line1\r\nline2\r\n' | tr -d '\r' | od -c | head -1
0000000   l   i   n   e   1  \n   l   i   n   e   2  \n
```

## Complement, where it gets powerful

`-c` inverts the set: act on everything *except* these. Combined with `-d`, it becomes a whitelist:

```bash
$ echo "abc-123_x" | tr -cd '[:alnum:]'
abc123x
```

Keep letters and digits, delete everything else, in nine characters. That is sanitising a filename or an identifier without a regular expression and without a loop.

## Squeeze

`-s` collapses runs of repeated characters down to one:

```bash
$ echo "trop    d espaces" | tr -s ' '
trop d espaces
```

Useful before `cut -d' '`, which counts every space as a separator and falls apart on ragged alignment. `tr -s ' '` first, and the fields line up.

## Portability

Every example above produced identical output on macOS and on Ubuntu, including the `wolld` surprise and the POSIX classes. Then I tried an accented character, expecting a footnote, and got a real difference:

```bash
# Linux, both GNU and the Rust build
$ echo "café" | tr 'é' 'e'
cafee

# macOS
$ echo "café" | tr 'é' 'e'
cafe
```

`é` is two bytes in UTF-8. GNU and uutils both work on bytes, so each of those two bytes gets mapped to `e` and you get one letter too many. The macOS implementation handled the character as a character.

I had assumed this would break on the Mac and work on Linux. It is the other way round, and the Linux behaviour is the one that follows the specification: `tr` is defined on bytes. Do not use it on non-ASCII text at all. `iconv -f UTF-8 -t ASCII//TRANSLIT` is the tool for that job.

One more limit: `tr` reads standard input only, so there is no in-place mode and no filename argument. It is always `tr ... < file` or a pipe.
