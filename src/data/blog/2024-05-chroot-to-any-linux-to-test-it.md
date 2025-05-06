---
author: davlgd
pubDatetime: 2024-05-11T13:37:00Z
title: Chroot to any Linux (to test it)
description: Bring your own kernel
tags:
  - Linux
  - Tools
  - Tutorials
ogImage: /src/assets/images/2024-05-chroot-linux.webp
---

In a previous article, I talked about [what's a (minimal) Linux](/posts/2024-05-whats-a-minimal-linux/) and explained how to launch such a system with only a compiled kernel, an initramfs and BusyBox to get some tools. You should now understand that a Linux based system needs a filesystem to be working and useful.

Rules are defined in the [Filesystem Hierarchy Standard (FHS)](https://refspecs.linuxfoundation.org/fhs.shtml). That's what initramfs and BusyBox provided in a very basic way. But a Linux distribution brings more: lots of tools, libraries, config files, etc. Except from its prebuilt kernel, it's what makes it different from another.

Thus, you can test any distribution on your local machine, without installing it, without any virtualization stack. You just need to get its file system and use it with your own kernel. There is a tool for that: [chroot](https://linux.die.net/man/1/chroot). It's a command included since the 7th Edition of Unix (1979).

## I am chroot

You don't trust it's so simple? Let's try it with Alpine Linux. It's a very lightweight distribution, based on musl libc and BusyBox, distributed [in many ways](https://www.alpinelinux.org/downloads/), including a [tarball](<https://en.wikipedia.org/wiki/Tar_(computing)>) containing its file system.

Download it and extract it:

```bash
wget https://dl-cdn.alpinelinux.org/alpine/v3.19/releases/x86_64/alpine-minirootfs-3.19.1-x86_64.tar.gz
mkdir alpine
tar xPf alpine-minirootfs-3.19.1-x86_64.tar.gz -C alpine
```

Then, you just need to `chroot` into it, launching `sh` shell as Bash is not included in Alpine by default:

```bash
sudo chroot alpine /bin/sh
```

To see you're in a different environment, check `/etc/os-release`:

```bash
cat /etc/os-release
```

You should see something like:

```bash
NAME="Alpine Linux"
ID=alpine
VERSION_ID=3.19.1
PRETTY_NAME="Alpine Linux v3.19"
HOME_URL="https://alpinelinux.org/"
BUG_REPORT_URL="https://gitlab.alpinelinux.org/alpine/aports/-/issues"
```

What happens here is that `chroot` changes the root (`/`) directory of the current process to the `alpine/` folder. Thus, you see it as if you booted on an Alpine Linux system, after the `init` and login.

You're still on your host system, with your kernel, your processes, etc. But no local network, Internet access, devices access, or whatever.

To enable them, `exit` and mount some directories from your host system to the `chroot` environment (with `--bind` when we need to reflect the original). To get Internet, you'll also need a proper DNS `resolv.conf` file:

```bash
sudo mount --bind /dev alpine/dev
sudo mount -t devpts /dev/pts alpine/dev/pts
sudo mount -t proc /proc alpine/proc
sudo mount -t sysfs /sys alpine/sys
cp /etc/resolv.conf alpine/etc/resolv.conf
```

Then, you can `chroot` again and install some packages, like `neofetch`:

```bash
sudo chroot alpine /bin/sh
apk update
apk add neofetch
neofetch
```

It should show some information about the system like the distribution ([ASCII](https://en.wikipedia.org/wiki/ASCII)) logo, kernel version, CPU, memory, screen resolution, uptime, etc.

After exiting the `chroot` environment, you should `umount` the directories in the reverse order of the `mount` command:

```bash
exit
sudo umount alpine/{sys,proc,dev/pts,dev}
```

## Chroot to any Linux

How to do that with any Linux distribution? For many of them, you can't just download an archive and `chroot` into it. You need to get the filesystem from somewhere else. One easy way is to use the Docker registry, extract content from an image and `chroot` into it. There is a tool for that: `docker export`.

Once Docker [is installed](https://docs.docker.com/engine/install/#supported-platforms) (or Podman with an alias), let's try with Arch Linux:

```bash
mkdir arch
docker create --name arch archlinux
docker export arch | tar x -C arch
```

Then, you can `chroot` into it:

```bash
sudo mount --bind /dev arch/dev
sudo mount -t devpts /dev/pts arch/dev/pts
sudo mount -t proc /proc arch/proc
sudo mount -t sysfs /sys arch/sys
cp /etc/resolv.conf arch/etc/resolv.conf
sudo chroot arch
```

Then, you can update system and install some packages, like `neofetch`:

```bash
pacman -Syu
pacman -S neofetch
neofetch
```

You can do the same with any other distribution, like Debian, Fedora, NixOS, Ubuntu, etc. You can also use any Linux based container image.

But never forget: you're still on your host system, with your kernel. It's just a different environment, with its own file system, tools, libraries, etc. If you use tools like `ps -a` or `top`, you'll see host processes.

## A script to play with this easily

To make it easier, I wrote a script to `chroot` into any Linux distribution, using Docker images. It's available on [GitHub](https://github.com/davlgd/chroot-from-image). For example, `chroot` into a system with `nginx` installed and launch it (port 80 by default).

The script downloads the Docker image, extract the filesystem, mount directories, and `chroot`. When you `exit`, it will automatically `umount` the directories and remove the Docker container and the extracted content.

```bash
git clone https://github.com/davlgd/chroot-from-image
cd chroot-from-image

# Use the script with the following syntax: ./chroot_from_image <image> <command>
# After launch of nginx, you'll exit the chroot environment, refuse to clean it
./chroot_from_image nginx nginx
```

Then, you can check that `nginx` is running, accessing it from the host system:

```bash
curl localhost # It works from host system, too!
```

To stop `nginx`, kill its processes and use the `clean_image` script to unmount, remove the Docker container and the extracted content:

```bash
kill $(pidof nginx)
./clean_image nginx
```
