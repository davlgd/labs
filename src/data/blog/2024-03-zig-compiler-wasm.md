---
author: davlgd
pubDatetime: 2024-03-07T13:37:00Z
title: "Zig and WASM: your best friend here is the compiler"
description: "WASM is coming... everywhere!"
tags:
  - Go
  - V
  - Zig
  - WASM
  - Compiler
  - Tools
ogImage: /src/assets/images/2024-03-wasm-compiler-zig.webp
---

Some days ago, MJ Grzymek published an interesting piece on [his blog](https://blog.mjgrzymek.com/blog/zigwasm) about how Zig can be compiled in WASM and used for efficient web development. It reminded me I want to write about Zig and WASM for months.

Not because I'm in love with this language, I find it messy (and I'm not a low level guy). But its compiler is dope! Notably, it allows you to compile C/C++ code to WASM/WASI. And that could be a game changer!

## Zig compiler can compile C/C++ too

Once [installed](https://ziglang.org/download/), `zig` help command will show you this message:

```bash
info: Usage: zig [command] [options]

Commands:

  build            Build project from build.zig
  init-exe         Initialize a `zig build` application in the cwd
  init-lib         Initialize a `zig build` library in the cwd

  ast-check        Look for simple compile errors in any set of files
  build-exe        Create executable from source or object files
  build-lib        Create library from source or object files
  build-obj        Create object from source or object files
  fmt              Reformat Zig source into canonical form
  run              Create executable and run immediately
  test             Create and run a test build
  translate-c      Convert C code to Zig code

  ar               Use Zig as a drop-in archiver
  cc               Use Zig as a drop-in C compiler
  c++              Use Zig as a drop-in C++ compiler
  ...
```

As you can see here, `zig` can be used as a drop-in C/C++ compiler.

For example, you can create a `guess.c` file:

```c
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

int main() {
    int number, guess, attempts = 0;
    srand(time(NULL));
    number = rand() % 421 + 1;

    printf("Guess a number between 1 and 421\n");
    do {
        scanf("%d", &guess);
        attempts++;
        if (guess > number) {
            printf("Lower number please!\n");
        } else if (guess < number) {
            printf("Higher number please!\n");
        } else {
            printf("You guessed %d it in %d attempts\n", number, attempts);
        }
    } while (guess != number);

    return 0;
}
```

Then compile it with `zig`:

```bash
zig cc guess.c -o guess
./guess
```

And it works! You can do the same with a C++ code in an `analyze.cpp` file:

```c++
#include <string>
#include <sstream>
#include <iostream>

int main() {
    std::string line;
    int lineCount = 0, charCount = 0, charNoSpacesCount = 0, wordCount = 0;

    while (std::getline(std::cin, line)) {
        lineCount++;
        charCount += line.length();

        for (char c : line) {
            if (c != ' ') {
                charNoSpacesCount++;
            }
        }

        std::stringstream ss(line);
        std::string word;
        while (ss >> word) {
            wordCount++;
        }
    }

    // Display results, formatted as JSON
    std::cout << "{" << std::endl;
    std::cout << "  \"Line count\": " << lineCount << "," << std::endl;
    std::cout << "  \"Character count (including spaces)\": " << charCount << "," << std::endl;
    std::cout << "  \"Character count (excluding spaces)\": " << charNoSpacesCount << "," << std::endl;
    std::cout << "  \"Word count\": " << wordCount << std::endl;
    std::cout << "}" << std::endl;

    return 0;
}
```

Compile it with `zig` and run it:

```bash
zig c++ analyze.cpp -o analyze
./analyze analyze.cpp | jq
```

It will show you the number of lines, characters, words, JSON formatted.

## Compile (some of) your C/C++ code to WASM/WASI

But the `zig` compiler also have a `-target` option, which can be used to compile previous C/C++ code to [WASM/WASI](https://github.com/WebAssembly/WASI) with no changes.

Thus, it can run on any platform with a WASM runtime, such as [Wasmtime](https://wasmtime.dev/):

```bash
zig cc -target wasm32-wasi guess.c -o guess.wasm
zig c++ -target wasm32-wasi analyze.cpp -o analyze.wasm
wasmtime guess.wasm
wasmtime analyze.wasm < analyze.cpp | jq
```

Note there are some limitations, as I wasn't able to manipulate files. It's why I relied on `stdin` in the previous example. So, the following C++ code compiles and runs, but not with the `wasm32-wasi` target:

```c++
#include <iostream>
#include <fstream>

int main(int argc, char* argv[]) {

    std::ifstream file(argv[1]);
    if(!file.is_open()) {
        std::cerr << "Error: could not open file\n";
        return 1;
    }

    std::string line;
    while(std::getline(file, line)) {
        std::cout << line << '\n';
    }

    file.close();
    return 0;
}
```

The following C code compiles in WASM, but doesn't run, I get a `could not open file` error:

```c
#include <stdio.h>
#include <stdlib.h>

int main(int argc, char* argv[]) {

    FILE *file = fopen(argv[1], "r");
    if(file == NULL) {
        fprintf(stderr, "Error: could not open file\n");
        return 1;
    }

    char *line = NULL;
    size_t len = 0;
    ssize_t read;

    while((read = getline(&line, &len, file)) != -1) {
        printf("%s", line);
    }

    free(line);
    fclose(file);

    return 0;
}
```

As WASM/WASI (`preview2` was [recently announced](https://bytecodealliance.org/articles/WASI-0.2)) and `zig` compiler evolves, be sure it will be possible to do more and more things.

## What about V?

I couldn't end without trying to compile [V](/tags/v) code to WASM through `zig`. For the record, V compiler supports multiple backends (`c`, `go`, `js`, `js_browser`, `js_node`, `js_freestanding`) and `wasm`. Thus, the following `hello.v` file:

```v
fn main() {
    println('Hello, WASM!')
}
```

Can be compiled to WASM:

```bash
v -backend wasm hello.v -o hello.wasm
wasmtime hello.wasm
```

But this doesn't work with modules. For example, this `analyze.v` file:

```v
import os
import json { encode }

struct Stats {
mut:
	line_count            int
	char_count            int // Including spaces
	char_no_spaces_count  int // Excluding spaces
	word_count            int
}

fn main() {
	mut stats := Stats{}

	for line in os.get_lines() {
		stats.line_count++
		stats.char_count += line.len
		stats.char_no_spaces_count += line.replace(' ', '').len

		words := line.split(' ').filter(it != '')
		stats.word_count += words.len
	}

	// Serialize `stats` to JSON
	json_str := encode(stats)
	println(json_str)
}
```

Compiles well in V, but not with a `wasm` backend. I tried with the `c` backend and then with `zig cc`... it leads to errors.

## Go: the good balance for WASM/WASI?

What's important here, is to see how WASM/WASI is gaining traction in multiple languages. Rust supports it as a target for a long time, there are movements from languages such as [OCaml](https://discuss.ocaml.org/t/announcing-the-ocaml-wasm-organisation/12676), [Python](https://github.com/python/cpython/blob/main/Tools/wasm/README.md), [Ruby](https://github.com/ruby/ruby.wasm), etc.

Since last summer, [and the 1.21 release](https://go.dev/blog/go1.21), Go compiler natively supports WASM/WASI backend. And it works pretty well, it's my personal choice for multiples WASM projects, easy to bootstrap.

For example, this `analyze.go` file:

```go
package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

type Statistics struct {
	LineCount             int `json:"Line count"`
	CharacterCount        int `json:"Character count (including spaces)"`
	CharacterCountNoSpace int `json:"Character count (excluding spaces)"`
	WordCount             int `json:"Word count"`
}

func main() {
	scanner := bufio.NewScanner(os.Stdin)

	var stats Statistics

	for scanner.Scan() {
		line := scanner.Text()
		stats.LineCount++
		stats.CharacterCount += len(line)
		stats.CharacterCountNoSpace += len(strings.ReplaceAll(line, " ", ""))
		stats.WordCount += len(strings.Fields(line))
	}

	if err := scanner.Err(); err != nil {
		fmt.Fprintf(os.Stderr, "reading standard input: %v", err)
	}

	jsonData, err := json.MarshalIndent(stats, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "error marshalling stats to JSON: %v", err)
		return
	}

	fmt.Println(string(jsonData))
}
```

Compiles and runs well in WASM:

```bash
GOOS=wasip1 GOARCH=wasm go build -o analyze.wasm analyze.go
wasmtime analyze.wasm < analyze.go | jq
```

Note that the built WASM file is 2.5MB, compared to 3.3/3.4MB with `zig` from C/C++. The binary was 48K in native C++, 177K in native V with JSON module.
