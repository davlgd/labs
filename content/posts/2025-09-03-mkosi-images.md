---
author: davlgd
pubDatetime: 2025-09-03T13:37:00Z
title: "mkosi: one config file, twelve kinds of image"
description: "Declarative, and it burns to USB"
tags:
  - Linux
  - Tools
ogImage: /images/2025-09-mkosi-os-images.webp
---

Building a bootable system image usually means `debootstrap` and a folder of shell scripts nobody wants to touch. [`mkosi`](https://github.com/systemd/mkosi) replaces that with an INI file, and it comes from the systemd project, which tells you something about the target audience.

## The whole thing is a config file

```ini
# mkosi.conf
[Distribution]
Distribution=debian
Release=trixie

[Output]
Format=directory
ImageId=demo

[Content]
Packages=bash systemd curl
```

Three sections: which distribution, what shape of output, what goes inside. Then `mkosi build`.

The verb to learn before that one is `summary`, which shows what it *would* build:

```bash
$ mkosi summary
    DISTRIBUTION:
                       Distribution: debian
                            Release: trixie
                      Output Format: directory
                           Image ID: demo
                           Packages: bash
```

Configuration layers across several files and drop-in directories, so being able to ask "what did all of that add up to" saves a build every time. `cat-config` goes further and prints the merged result.

## The format list is the real feature

That one `Format=` line is where this stops being a container tool:

```text
confext, cpio, directory, disk, esp, none, portable, sysext, tar, uki, oci, addon
```

Twelve artefact types from the same configuration and the same package list. `disk` gives a bootable GPT image. `uki` gives a Unified Kernel Image, kernel and initrd and command line in one signed PE binary. `sysext` and `confext` are systemd system and configuration extensions, layered onto a running immutable host. `portable` builds a portable service. And `oci` produces a container image, so the tool people describe as "not Docker" will hand you a Docker-compatible artefact if you ask.

That is the argument for it. A Dockerfile is a script whose result depends on when you ran it, and it produces exactly one kind of thing. `mkosi.conf` is a description, and the output shape is a parameter.

Bootloaders are a parameter too: `--bootloader` takes `systemd-boot`, `grub`, `uki`, and signed variants of each. `mkosi genkey` generates the keys, the part that makes Secure Boot approachable instead of a weekend.

## It is a lifecycle, not a builder

The verbs after `build` are why I keep it around:

```bash
mkosi shell        # run a command in the image, without booting it
mkosi boot         # boot it under systemd-nspawn
mkosi vm           # boot it in a virtual machine
mkosi ssh          # get a shell in the running one
mkosi journalctl   # read the built image's journal
mkosi coredumpctl  # inspect crashes from it
```

`journalctl` and `coredumpctl` against a built image are the ones nobody expects. You build, it fails to boot, and you read its journal with the same command you would use on a live machine.

That covers the gap I hit in [chrooting into a distribution](/posts/2024-05-chroot-to-any-linux-to-test-it/): a chroot gets you a userland and stops at anything involving init, the kernel or the boot path. Here the loop from "change a package list" to "did it boot" is two commands.

## Getting the image somewhere

Three more verbs, and they cover the awkward last mile:

```bash
mkosi serve        # serve the output directory over HTTP
mkosi burn /dev/sdX # write the image straight to a USB stick
mkosi sysupdate    # image-based updates, via systemd-sysupdate
```

`burn` is the one that makes it concrete: config file to bootable USB stick without `dd` and without looking up the arguments again. `sysupdate` is the other end, where the unit of deployment is a whole signed image and updating a fleet means publishing a new one.

## What it needs from you

Unpacking a distribution means creating files owned by arbitrary users, so `mkosi` needs real privileges. Run it on a machine where you have root, or under its own `mkosi sandbox`. Without that it gets a fair way in and then stops at the first `chown`. That is the error you will see if you try it inside an unprivileged container.

It is Linux only, since it leans on systemd tooling and Linux namespaces, so a Mac needs a VM around it.

Install is `apt install mkosi` on Debian and Ubuntu, or straight from the repository. Version 26 is what I looked at here, and the configuration surface is wide enough that `summary` and `cat-config` are the two commands worth learning first.
