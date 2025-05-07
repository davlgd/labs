---
author: davlgd
pubDatetime: 2025-05-07T13:37:00Z
title: "expect: when yes is not the answer to every question"
description: "When one 'y' won't do"
tags:
  - Shell
  - Tools
  - Tutorials
ogImage: /images/2025-05-expect-automation.webp
---

Last year I wrote about [the `yes` command](/posts/2024-02-yes-command/) and ended on a cliffhanger: when a script waits for different answers, `yes` won't help, and you may reach for `expect` instead. I left it there. Time to keep my word.

## Where yes gives up

Here is a small installer that asks three questions. The first two take whatever you type, but the third one checks it, and wants the word `yes` in full:

```bash
#!/bin/bash
read -p "Project name: " name
read -p "Use TypeScript? (y/n) " ts
read -p "Confirm creation of '${name}'? (yes/no) " ok

[[ "${ok}" == "yes" ]] || { echo "Aborted."; exit 1; }
echo "Created ${name} (typescript=${ts})"
```

Save it as `setup.sh` and feed it with `yes`:

```bash
$ chmod +x setup.sh

$ yes | ./setup.sh
Aborted.

$ echo $?
1
```

That's the whole problem in three lines. `yes` with no argument repeats `y` forever, so the project got named `y`, TypeScript got `y`, and the confirmation got `y` where the script wanted the word `yes`. One answer for every question means a wrong answer to most of them.

## Say what you expect

[`expect`](https://core.tcl-lang.org/expect/index) was written by Don Libes at NIST, and presented at the Summer 1990 USENIX conference in a paper with the best title in the field: "expect: Curing Those Uncontrollable Fits of Interactivity". It drives an interactive program through a pseudo-terminal, so it believes a human is typing. You describe the conversation: wait for this prompt, send that answer.

```tcl
#!/usr/bin/expect -f

set timeout 10
spawn ./setup.sh

expect "Project name: "               { send "labs\r" }
expect "Use TypeScript? "             { send "n\r"    }
expect "Confirm creation of 'labs'? " { send "yes\r"  }

expect eof
exit [lindex [wait] 3]
```

The first line is the shebang, which tells the kernel what to run the file with. Everything after it is Tcl: Expect is not a language of its own but an extension of one, so `set` and `lindex` are Tcl commands, while `spawn`, `send`, `expect` and `wait` are what Expect adds on top.

`spawn` starts the program, each `expect` blocks until its pattern shows up, and `send` types the answer (`\r` is the Return key, not `\n`).

The last two lines matter more than they look: `expect eof` waits for the program to finish instead of killing it mid-run, and `wait` gives you back its exit code so a CI job can act on it.

Those square brackets are Tcl's command substitution, the equivalent of backticks in a shell. `wait` returns a list of four integers, the last of which is the status of the spawned process, so `[lindex [wait] 3]` takes that one and hands it to `exit`.

Save it as `setup.exp` and run it:

```bash
$ chmod +x setup.exp

$ ./setup.exp
spawn ./setup.sh
Project name: labs
Use TypeScript? (y/n) n
Confirm creation of 'labs'? (yes/no) yes
Created labs (typescript=n)

$ echo $?
0
```

Three questions, three different answers, and the real exit code. That's what `yes` structurally cannot do.

## Let autoexpect write it for you

Writing those patterns by hand gets tedious. `autoexpect` records a real session and hands you the script:

```bash
autoexpect ./setup.sh
```

You answer the questions once, and it writes `script.exp`, ready to replay. It's honest about itself, too. The generated header warns that it "does not guarantee a working script" and explains that it has to guess about timing and about which parts of the output are stable. 

Treat it as a first draft: it captures the conversation, you delete the noise and loosen the patterns that were too specific.

## Two traps worth knowing

The first one cost me a few minutes while testing this post. On macOS I wrote the shebang as `#!/usr/bin/env expect -f` and it ran fine. The same file on Ubuntu:

```bash
$ ./setup.exp
env: 'expect -f': No such file or directory
env: use -[v]S to pass options in shebang lines
```

Linux passes everything after the interpreter as a single argument, so `env` looks for a program literally named `expect -f`. Use `#!/usr/bin/expect -f` and it works on both. That `env` behaviour deserves its own post one day.

The second trap is availability. macOS ships `expect` 5.45 out of the box, but only `expect`: no `autoexpect`, no `unbuffer`. On Ubuntu the `expect` package brings it all:

```bash
sudo apt install expect     # Debian, Ubuntu
brew install expect         # macOS, if you want autoexpect
```

And the honest limit: `expect` matches on output, so it's only as reliable as the prompts it waits for. Reword a prompt and the script hangs until `timeout` fires. When a program offers a `--yes`, a `--non-interactive` or a config file, that's still the better answer. `expect` is what you use when nobody left you one.
