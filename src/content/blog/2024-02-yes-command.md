---
author: davlgd
pubDatetime: 2024-02-10T13:37:00Z
title: "Do you know the yes command?"
description: "Automate, the old-fashioned way"
tags:
  - Shell
  - Tools
ogImage: /src/assets/images/2024-02-unix-old-PC-yes.webp
---

Whether you are running GNU/Linux, macOS or even one of the BSD derivatives, you're using a UNIX-based system. Developed in the 70s, this family of multi-user, multitasking OS is now a major standard in the IT industry.

## Better know UNIX

It comes with many tools. You probably use some of them on a daily basis, like `ls`, `cd`, `cp`, `mv`, `rm`, `mkdir`, etc. But there are many more, and some you may not be familiar with. A good example is the [`yes`](https://linux.die.net/man/1/yes) command.

It outputs a string with a line break repeatedly until killed. It was conceived to developers' need to automate applications execution, while some of them didn't always offer a flag to prevent user interaction.

It's therefore a kind of `repeat` command, you can use this way:

```bash
yes                 # Repeat the "y" string
yes yes             # Repeat the "yes" string
yes | ./script.sh   # Repeat the "y" string and pipe it to a script
```

You can do the same with a longer string to write in a text file:

```bash
yes "Lorem ipsum dolor sit amet, consectetur adipiscing elit. \
Aenean lacus est, laoreet et ornare eu, commodo sed nibh. \
Vestibulum ut eros tristique, consectetur nulla sed, ullamcorper diam. \
Integer tristique quis augue eget sagittis. Suspendisse velit urna, \
hendrerit eu mauris et, eleifend posuere augue. Curabitur eu suscipit lorem, \
ut iaculis diam. Vivamus aliquet arcu turpis, quis efficitur sem volutpat ac. \
Vestibulum iaculis, nisl ac molestie lobortis, turpis orci tincidunt ligula, \
eleifend volutpat nisl augue vitae erat." | head -n 10 > lorem.txt
```

## Test it

If you want an example script, here is a simple one that asks permission before executing a command provided as an argument:

```bash
#!/bin/bash

if [[ $# -eq 0 ]]; then
    echo "No command provided. Exiting."
    exit 1
else
    user_command=$1
fi

echo "Do you want to execute: ${user_command}? (yes/no)"
read proceed_answer
echo
echo "You answered: ${proceed_answer}"

if [[ "${proceed_answer}" == "yes" ]]; then
    ${user_command}
else
    echo "Permission not granted. Exiting."
    exit 1
fi
```

Save it as `ask.sh`, make it executable (`chmod +x ask.sh`) and run it with the `yes` command to answer "yes" or "no" to the question:

```bash
yes yes | ./ask.sh "echo 'Hello, world!'"
yes no | ./ask.sh "echo 'Hello, world!'"
```

Note you can use it on Windows through [CoreUtils](https://gnuwin32.sourceforge.net/packages/coreutils.htm) or its [Rust implementation](https://github.com/uutils/coreutils).

## A great tool, with limits to know

Thus, it can be very useful to automate tasks, but there are some caveats. For example, you shouldn't use it when a script is waiting for different answers until it ends, because it will always answer the same thing.

It's also not a good idea when you are waiting for a context-specific answer or dealing with a more complex case. In such situations, you may use `expect` or `autoexpect` instead... but these commands are another story.
