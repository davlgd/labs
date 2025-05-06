---
author: davlgd
pubDatetime: 2024-10-21T13:37:00Z
title: How to create a CLI in V
description: That's what "batteries included" means
tags:
  - V
  - CLI
  - Tools
  - Tutorials
ogImage: /src/assets/images/2024-10-v-compression.webp
draft: false
---

As some of you may know, I'm a fan of [V](https://vlang.io/), a programming language inspired by [Go](https://go.dev/) but trying to do better on many fronts, with great tooling and native libraries. You can learn more in [its documentation](https://docs.vlang.io/introduction.html), using [its playground](https://play.vlang.io/) or watching [this quickie session](https://www.youtube.com/watch?v=YEiWEiamXrk) from Devoxx France 2024.

I've already covered some aspects of V in a previous article detailing [how to create a tiny web server](/posts/2024-02-how-own-web-server-vlang/), which leads me [to publish tVeb](https://github.com/davlgd/tVeb). More recently, I decided to explore the `cli` module of V, whose aim is to provide a simple way to create application with commands, flags, help, man, etc.

So I decided to create a simple CLI using another great included module: `compress`. As you may have guessed, it compresses data. In my case, files.

To follow this tutorial [you'll need V](https://docs.vlang.io/installing-v-from-source.html) and a file editor, nothing more.

## Compressing files with V

Let's create a new folder and a `main.v` file. For this first step, it creates a text file and compress it with `gzip`. Here we'll assume the folder is empty, so we don't have to check if the file already exists for example:

```v
import os
import compress.gzip

fn main() {
    // Define the file names
    filename := 'test.txt'
    compressed_filename := '${filename}.gz'

    // Create a simple text file
    // The `!` is a way to ignore errors
    os.write_file(filename, 'Hello, world!')!

    // Read the file, in bytes to pass to the compressor
    content := os.read_bytes(filename)!
    compressed_content := gzip.compress(content)!

    // Create the compressed file, or open it if it already exists
    // Here there is an error handling, change `create` by `open` to test it
    mut file_compressed := os.create(compressed_filename) or {
        eprintln('Impossible to access $compressed_filename')
        exit(1)
    }

    // Write the compressed content to the file
    file_compressed.write(compressed_content)!
    file_compressed.close()
    println("✅ File compressed to '$compressed_filename'!")
}
```

Run it with `v run main.v`. You should see a `test.txt.gz` file in the same folder. You can check it has been compressed correctly with :

```bash
$ gzip -d test.txt.gz -c
Hello, world!
```

## Zstd and its parameters

The `compress` module provides a wrapper around [Zstandard](https://facebook.github.io/zstd/) (learn more [with Hubert](https://www.youtube.com/watch?v=BVM5vsPYbfg)). It allows to natively define a compression level and how many CPU threads to use. To do so, just edit some lines of the code above:

```v
...
import compress.zstd
...
compressed_filename := '${filename}.zst'
...
compressed_content := zstd.compress(
  content,
  compression_level: 8,
  nb_threads: 4)!
...
```

You should see a `test.txt.zst` file in the same folder. If `zstd` is installed on your system, you can check it has been compressed correctly with:

```bash
$ zstd -d test.txt.zst -c
Hello, world!
```

## Let's start to CLI

What if we want to define compression level and number of threads as parameters and not hardcode them? It's where the `cli` module helps.

It allows to define an application, its name, version, description, add commands and flags to it. Here we'll just define a main command to compress a file and add flags to define compression level and number of threads:

```v
import os
import runtime
import cli { Command, Flag }

fn main() {
    mut app_cli := Command{
        name: 'Compressor'
        description: 'A tiny CLI to compress files with Zstandard'
        version: '0.1.0'
        execute: compress
    }

    app_cli.add_flag(
        Flag{
            flag: cli.FlagType.int
            name: 'level'
            abbrev: 'l'
            description: 'Compression level'
            default_value: ['8']
            required: false
        }
    )

    app_cli.add_flag(
        Flag{
            flag: cli.FlagType.int
            name: 'threads'
            abbrev: 't'
            description: 'Number of threads'
            default_value: [runtime.nr_cpus().str()]
            required: false
        }
    )
    app_cli.setup()
	app_cli.parse(os.args)
}
```

As you can see, we define short aliases for flags (`abbrev`), set default values, what's required or not, etc. In the case of the `threads` flag, we set the default value to the maximum supported by the CPU with `runtime.nr_cpus()`. Some flags are automatically added, like `help`, `man` or `version`.

Then, we define the `compress` function, called when the command is executed. As `V` allows us, we'll do it in a dedicated file, named `compress.v`:

```v
import os
import cli { Command, Flag }
import compress.zstd

// The calling command is passed as a parameter
// The return is void, with no error handling (`!`)
fn compress(cmd cli.Command) ! {
    // Define the file names
    filename := 'test.txt'
    compressed_filename := '${filename}.zst'

    // Create a simple text file
    // The `!` is a way to ignore errors
    os.write_file(filename, 'Hello, world!')!

    level := cmd.flags.get_int('level')!
    threads := cmd.flags.get_int('threads')!

    println('Algorithm: Zstandard, level: $level, threads: $threads')

    // Read the file, in bytes to pass to the compressor
    content := os.read_bytes(filename)!
    compressed_content := zstd.compress(
        content,
        compression_level: level,
        nb_threads: threads
    )!

    // Create the compressed file, it will be open if it already exists
    // Here there is an error handling, change create by open to test it
    mut file_compressed := os.create(compressed_filename) or {
        eprintln('Impossible to access $compressed_filename')
        exit(1)
    }

    // Write the compressed content to the file
    file_compressed.write(compressed_content)!
    file_compressed.close()
    println("✅ File compressed to '$compressed_filename'!")
}
```

As for `main.v` it will be considered as included in the `main` module used by default. You can also add `module main` at the beginning of both files if you prefer to be explicit. To run the project across files, use:

```bash
v run .
```

Now it's time to compile and check flags are working:

```bash
$ v -prod . -o compressor

$ ./compressor version
Compressor version 0.1.0

$ ./compressor -help
Usage: Compressor [flags] [commands]

A tiny CLI to compress files with Zstandard

Flags:
 -l  -level          Compression level
 -t  -threads        Number of threads
     -help           Prints help information.
     -version        Prints version information.
     -man            Prints the auto-generated manpage.

Commands:
 help                Prints help information.
 version             Prints version information.
 man                 Prints the auto-generated manpage.

$ ./compressor -l 22 -t 2
Algorithm: Zstandard, level: 22, threads: 2
✅ File compressed to 'test.txt.zst'!
```

Of course, you can go further: add file management, error handling, more commands, options, etc. Just take a look at the `cli` module [documentation](https://modules.vlang.io/cli.html). You can also find a more complete version of this tool in [this repository](https://github.com/davlgd/vCompressor).
