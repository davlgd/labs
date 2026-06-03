---
author: davlgd
pubDatetime: 2026-06-03T13:37:00Z
title: "strings, file and xxd: looking inside a binary"
description: "What is this file, really?"
tags:
  - Shell
  - Tools
ogImage: /images/2026-06-binary-inspection-tools.webp
---

You have a file with no extension, or the wrong one, or one you do not trust. Three commands answer three different questions about it, and none of them needs a debugger or a hex editor.

## file, for what it is

`file` ignores the name entirely and reads the contents:

```bash
$ file -b 2026-05-verne-static-generator.webp
RIFF (little-endian) data, Web/P image, VP8 encoding, 1792x1024, Scaling: [none]x[none], YUV color, decoders should clamp
```

Not just "an image": the container, the codec, the dimensions and the colour model. `-b` drops the filename from the output, what you want in a script.

The proof that it reads bytes and not names is to take the extension away:

```bash
$ cp 2026-05-verne-static-generator.webp noext

$ file -b noext
RIFF (little-endian) data, Web/P image, VP8 encoding, 1792x1024, Scaling: [none]x[none], YUV color, decoders should clamp
```

Identical. For scripting, `--mime-type` gives you something parseable:

```bash
$ file -b --mime-type 2026-05-verne-static-generator.webp
image/webp
```

That is the check to put in front of any upload handler, because the extension a user sends you is a suggestion and the bytes are not.

## xxd, for the actual bytes

When `file` says something surprising, look:

```bash
$ xxd -l 16 2026-05-verne-static-generator.webp
00000000: 5249 4646 7291 0000 5745 4250 5650 3820  RIFFr...WEBPVP8
```

`-l 16` limits it to the first sixteen bytes, where the magic number lives. `RIFF`, a size, then `WEBP` and `VP8`. That is exactly what `file` pattern-matched on, and seeing it makes the whole mechanism concrete.

The flag people miss is `-r`, which reverses the dump back into bytes:

```bash
$ printf 'Hello' | xxd
00000000: 4865 6c6c 6f                             Hello

$ printf 'Hello' | xxd | xxd -r
Hello
```

A round trip. That makes `xxd` an editor: dump a file to hex, patch a byte with `sed`, reverse it back. Ugly, and occasionally the only way to fix a corrupted header.

`od -c` covers the other common need, showing whitespace as escapes:

```bash
$ printf 'a\tb\n' | od -c
0000000   a  \t   b  \n
0000004
```

That is how you find out whether a file uses tabs or spaces, and whether it ends in a newline.

## strings, for the text inside

`strings` extracts printable sequences from binary data:

```bash
$ strings -n 6 /usr/bin/gnutrue | head -3
/lib64/ld-linux-x86-64.so.2
__libc_start_main
__cxa_finalize
```

`-n` sets the minimum run length, and raising it filters out noise: the default of 4 gives thousands of accidental matches. `strings /bin/ls` returns 59042 lines on my test box, unusable until you grep it.

What it is good for is finding what a binary knows about: an embedded path, a version string, an error message you saw but cannot locate in the source, a hardcoded URL. It is the first thing to run on a binary you did not build.

Two things it is not. It is not a decompiler, since it only recovers literals. And it is not a security check, because anything obfuscated or compressed will not show up at all.

## What you get where

All three are on macOS and on Debian and Ubuntu. `file` gave byte-identical output on both systems in my tests, down to the "decoders should clamp".

The one difference is `strings`. On Linux it is GNU binutils and takes `--version` and the long options. On macOS it comes from the Xcode toolchain, and the same call fails:

```bash
$ strings --version
error: /Applications/Xcode.app/.../usr/bin/strings: unknown flag: --version
```

`-n` works on both, which covers most uses. For anything more, `brew install binutils` gets you the GNU one.

A closing note on `file` and containers, since it caught me while testing this: on a system where `/bin/ls` is a symlink, `file` reports the link rather than following it. `file -L` dereferences, and the difference is worth knowing before you conclude that a binary is missing.
