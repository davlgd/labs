---
author: davlgd
pubDatetime: 2024-05-01T13:37:00Z
title: What's a (minimal) Linux?
description: KISS Linux, the manual way
tags:
  - Linux
  - Tools
  - Tutorials
ogImage: /src/assets/images/2024-05-linux-craftsmanship.webp
---

If you read this post, this blog, you certainly know (and use?) Linux. And even if you don't, it's probably part of your life. Because Linux won!

These days, it's everywhere: in the Cloud, its servers, but also phones, tablets, TVs, cars, fridges, watches, cameras, routers, IoT devices, supercomputers, space stations, Mars rovers, nuclear submarines, airplanes, drones, robots, game consoles, smart speakers, smart homes, smart cities, smart grids, smart factories, smart farms, smart hospitals, smart cars, smart everything. Sometimes, in desktop computers too...

## Let's talk about Linux

But when you discuss it with people, even confirmed users, you realize there are still a lot of questions and misconceptions about Linux. What is it, its kernel, why is there people yelling at you when you don't write GNU/Linux, what makes a distribution different from another, etc.

So, let's try to clarify things a bit with a blog post series and some practical stuff. It won't be that technical, but I hope it will help some to better understand Linux and its ecosystem, and why it's so precious.

Sorry BSD team, I won't elaborate more on it. Maybe later 😬

## Do you GNU?

As [stated by Wikipedia](https://en.wikipedia.org/wiki/Linux), Linux is not just A thing, it is "_a family of open-source Unix-like operating systems based on the Linux kernel, an operating system kernel first released on September 17, 1991, by Linus Torvalds_".

I won't go into the details of [the history of Unix and Linux](https://www.youtube.com/watch?v=vjMZssWMweA), Wikipedia is far better than me for such things. But you got it: we use this name to talk about the kernel and operating systems (OS) based on it.

In most situations, these OSes, or distributions, includes tools from [the GNU project](https://www.gnu.org/gnu/gnu.en.html). There are a lot, [almost 400!](https://www.gnu.org/manual/blurbs.html). All with the same [Free Software philosophy](https://www.gnu.org/philosophy/philosophy.en.html). It's why you should then talk about GNU/Linux.

## (Compile) the kernel

Kernel is the core of the system, the one talking to the hardware, managing resources, etc. It's (almost) the first thing that starts during boot.

[Linux is open source](https://www.kernel.org/), so you can read it, modify it, compile it, and use it. By the way, let's demystify something: no, it's not that hard to compile and use your own kernel. You don't believe me? Let's do it!

First, download a kernel [tarball](<https://en.wikipedia.org/wiki/Tar_(computing)>) (on a Linux based system), and extract it:

```bash
wget https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.8.8.tar.xz
tar xf linux-6.8.8.tar.xz
cd linux-6.8.8/
```

Configure with default settings and compile it (using all CPU cores):

```bash
make defconfig
make -j$(nproc)
```

Wait some minutes and... it's done! Install it could be as easy as a `make install`. But many distributions prefers to package it or provides their own tools. Why? Because the hard part is the configure step. You never use kernel with its default settings: you fine tune it, add some features, remove others, etc. And it's not that easy to do it right. But try it!

```bash
# If you want check and/or modify kernel configuration
# Result is stored in .config file
make clean
make menuconfig
make -j$(nproc)
```

## You almost have a Linux (system)

Once compiled, Linux kernel is available in the `arch/x86/boot/bzImage` file, but also in the `vmlinux` file. The first one is to boot the system, the second one is [for debugging](https://en.wikipedia.org/wiki/Vmlinux). Both are ready to use.

You wanna try? Let's download [qemu](https://www.qemu.org/docs/master/index.html), one of the fabulous tools [made by Fabrice Bellard](https://en.wikipedia.org/wiki/QEMU), and run your kernel in an emulated [x86_64](https://en.wikipedia.org/wiki/X86-64) machine:

```bash
qemu-system-x86_64 -kernel arch/x86/boot/bzImage
```

You'll see it booting. But soon after that, it fails. Why? Because you need more than just the kernel to have a working system. You need a lot of things: a file system, a network stack, a shell, a package manager, tools, themes, wallpapers, etc. That's what distributions are for.

They provide you all these things, pre-configured, ready to install from an ISO image. [They are a lot](https://upload.wikimedia.org/wikipedia/commons/1/1b/Linux_Distribution_Timeline.svg), for different purposes: servers, desktops, mobile, embedded systems. With different philosophies, preferences, strategies for packages management, etc.

You want to discover them? There are 300+ listed on [Distrowatch](https://distrowatch.com/), find yours!

## Init it!

To get a working system from a compiled kernel, we need an [initial ram disk](https://en.wikipedia.org/wiki/Initial_ramdisk) (known as `initrd` or more recently `initramfs`). It's a small file system containing an `init` command, loaded into memory at boot time.

It contains tools to mount the real file system, and then start the OS. There are many ways to create it, from `mkinitramfs` to `dracut`. But let's keep it simple, using the `cpio` archive software and a "Hello, world!" C program.

First, create a `initramfs` folder and a simple `init.c` file:

```bash
mkdir -p initramfs

cat > init.c <<EOF
#include <stdio.h>

int main() {
    printf("Hello, world!\n");
    return 0;
}
EOF
```

Compile it with `-static` to get a standalone binary in `initramfs` folder:

```bash
gcc -static init.c -o initramfs/init
```

Then create the `initramfs` archive with `cpio` and [gzip it](https://www.youtube.com/watch?v=JARVYdwNSrI):

```bash
cd initramfs
find . | cpio -H newc -o | gzip > ../initramfs.cpio.gz
cd ..
```

Now, boot the kernel with this `initramfs` file. Here we use `qemu` with more complete options to enable [KVM](https://en.wikipedia.org/wiki/Kernel-based_Virtual_Machine), native CPU instructions, a serial console to see the output of the `init` program. We also disable the graphical output, and ask to stop the system after the `init` program ends/panics:

```bash
qemu-system-x86_64 -kernel arch/x86/boot/bzImage -initrd initramfs.cpio.gz \
    --enable-kvm -cpu host -nographic -no-reboot \
    -append "console=ttyS0 panic=1"
```

The kernel starts, the `initramfs` compressed file is mounted, the `init` script found and started. Then, the "Hello, world!" message is printed before the system stops (because there is nothing more to do).

It's a good start, isn't it? But we want more than that...

![Hello, world! from qemu](/src/images/2024-05-linux-qemu.webp)

## Embed BusyBox

We want a shell, some apps, etc. For this example we won't embed the full GNU toolset, but a subset of them: [BusyBox](https://busybox.net/). It's a single binary containing many common Unix commands, like `ls`, `cat`, `cp`, `mv`, `rm`, `grep`, etc.

Download it, configure it with static linking, compile it, and install it in the `initramfs` directory:

```bash
wget https://busybox.net/downloads/busybox-1.36.1.tar.bz2
tar xf busybox-1.36.1.tar.bz2
cd busybox-1.36.1/

# We configure and set CONFIG_STATIC=y to get a standalone binary
make defconfig
sed -i 's/# CONFIG_STATIC is not set/CONFIG_STATIC=y/' .config

# Compile and install it in the initramfs directory
make -j$(nproc)
make install CONFIG_PREFIX=../initramfs
```

Add some folders to mount a working file system, and an `init` executable script to start `sh` shell from BusyBox:

```bash
cd ../initramfs/
mkdir -p {dev,proc,sys}

cat > init <<EOF
#!/bin/sh

mount -t devtmpfs none /dev
mount -t proc none /proc
mount -t sysfs none /sys

echo "Welcome to my minimal Linux system!"
uname -a

# Understand this command: https://busybox.net/FAQ.html#job_control
exec setsid cttyhack /bin/sh
EOF

chmod +x init
```

Then create the `initramfs` file with `cpio` and `gzip` it:

```bash
find . | cpio -H newc -o | gzip > ../initramfs.cpio.gz
cd ..
```

Boot the kernel with this new `initramfs` file:

```bash
qemu-system-x86_64 -kernel arch/x86/boot/bzImage -initrd initramfs.cpio.gz \
    --enable-kvm -cpu host -nographic -no-reboot \
    -append "console=ttyS0 panic=1"
```

You should see the system booting and get a shell prompt:

```bash
[    0.990881] Freeing unused kernel image (initmem) memory: 2680K
[    0.991694] Write protecting the kernel read-only data: 26624k
[    0.992787] Freeing unused kernel image (rodata/data gap) memory: 1568K
[    1.041711] x86/mm: Checked W+X mappings: passed, no W+X pages found.
[    1.042542] x86/mm: Checking user space page tables
[    1.090060] x86/mm: Checked W+X mappings: passed, no W+X pages found.
[    1.090875] Run /init as init process
[    1.093103] mount (50) used greatest stack depth: 13864 bytes left
Welcome to my minimal Linux system!
Linux (none) 6.8.8 #1 SMP PREEMPT_DYNAMIC Wed May 1 14:42:21 CEST 2024 x86_64 GNU/Linux
~ #
```

You can now use some commands:

```bash
# Get informations about CPU and memory
# It's UNIX, everything is a file
cat /proc/cpuinfo
cat /proc/meminfo

# List devices and binaries
ls /dev/
ls /bin/
ls /sbin/

# Get system uptime
uptime
```

It's your first minimal Linux system, it uses less than 15 MB of storage, less than 10 MB of RAM. Have fun with it! 🎉

_PS: You'll find the full script from this guide [here](https://gist.github.com/davlgd/a34d07c767ea4ca923964b31c6d83096)._
