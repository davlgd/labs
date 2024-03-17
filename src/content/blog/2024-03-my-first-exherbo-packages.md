---
author: davlgd
pubDatetime: 2024-03-17T13:37:00Z
title: "A road story to my first Exherbo Linux packages"
description: "My love letter to distributed open source and home made things"
tags:
  - Exherbo
  - Linux
  - Tools
  - Tutorials
ogImage: /src/assets/images/2024-03-linux-oss-road.webp
---

As a kid, after years using an [Amstrad CPC 464](https://www.cpcwiki.eu/index.php/CPC_old_generation) (with a green/green screen), drawing rosettes in BASIC and playing video games through the cassette deck, I discovered the PC ecosystem through friends and family in the 90s.

Shortly after, I got my own [Intel 486 DX2](https://en.wikichip.org/wiki/intel/80486/486dx2-66) (66 MHz with Turbo) and started to learn MS-DOS 5.x, reading the official [user guide](https://archive.org/details/microsoft-ms-dos-5) on my spare time. Then MS-DOS 6.x Windows 3.x, Pentium, and so on. You know [what's next](https://www.davlgd.fr/39.html).

## Hello PC, and opening mind

Although I also had a [Nintendo Entertainment System](https://en.wikipedia.org/wiki/Nintendo_Entertainment_System) (NES) for video games, I was definitely more interested in computers. Not only did I play with them, but I learned how to use them, to make (digital) things with them. The pleasure to talk to [Dr. Sbaitso](https://en.wikipedia.org/wiki/Dr._Sbaitso), create my first applications or explore `AUTOEXEC.BAT` editing to get more paginated memory for [Commander Keen](https://www.abandonware-france.org/ltf_abandon/ltf_jeu.php?id=273).

As you may have noticed, I was mainly a Microsoft guy. My earliest memory of a Linux distribution I actually used, except from CD-ROMs we got in magazines, is Gaël Duval's [Mandrake](https://en.wikipedia.org/wiki/Mandriva_Linux). Like any geek of my generation, I also loved and played with [beOS](https://en.wikipedia.org/wiki/BeOS). It taught me a lot about the power of a well-designed operating system, and how good ideas do not always win.

The teenager me wasn't aware of the key role of open source, how it changes our approach to software, communities, development, security, distribution, access to knowledge. Nobody explained it to me, I certainly lacked curiosity on the matter, and it wasn't as widely discussed as of today.

## davlgd ❤️ open source

I discovered it over the years, during my time as an editor, covering the evolving trends in the IT market. I developed a real kink for communities and [distributed systems](https://next.ink/4851/de-linternet-distribue-a-victoire-plateformes/). Not the NFT Bro way, I'm more a [Merkle tree guy](https://next.ink/4998/de-git-a-bitcoin-en-passant-par-ipfs-derriere-foret-decentralisation-arbres-merkle/).

Through Internet, I was convinced we could achieve a broad sharing of knowledge (and still am, in spite of the dark informational times we live in). This reminds me of the Libre Software Meeting (RMLL) 2018 with my friend [pyg](https://x.com/pyg), where I discovered there were hands-on workshops for teaching ARM assembly to teens. And how well it could go if done in a playful way.

I wished I'd been raised at a time computers like the Raspberry Pi were affordable for everyone. But I was still happy I started out with BASIC long before discovering languages that gorged themselves with dependencies to create tools that, although simple, took up tens of MB once compiled.

So please, tell your kids about open hardware/software and distributed, KISS principles as soon as they're old enough to be interested in computers.

## From simple Linux user...

Over the past few decades, I've been using GNU/Linux distributions more and more. Sometimes as a day-to-day system, but mostly on bare-metal servers, in VMs/containers, on side desktop computers.

I used Debian and Ubuntu, having fun with [Compiz](https://www.youtube.com/watch?v=7HmuMwfASD0). Then I discovered openSUSE, Fedora, Arch and their derivatives (thanks [Distrowatch](https://distrowatch.com/)). Although I prefer to stay hardware/software agnostic, and use multiple types of systems/tools, I'm now a macOS-first user.

It brings me the best of both CLI/GUI worlds, and energy-efficient Apple Silicon SoC. It helps me to learn working on ARM-based architecture, which is interesting for my job, yet sometimes source of complexity.

On the GNU/Linux side, my favorite distro these days is [Manjaro/GNOME](https://manjaro.org/download/): it's based on Arch, so up-to-date through rolling releases, and its default configuration and tools are great for my (moving) needs.

During this open source journey, there was one thing missing: a source-based distribution. I've always been curious about them, but never had the time and enough motivation to try one. As I'm now part of the Clever Cloud's team, I chose to test [Exherbo Linux](https://www.exherbolinux.org/), which we use all over our platform.

## ...to (distributed) packager

I could have just used it in a container ([I sometimes do](/posts/2024-02-docker-alias/)), but I wanted to go further. When I started to read and learn about Exherbo, I was seduced by the philosophy behind it (explained by Bryan Østergaard [at FOSDEM 2009](https://www.youtube.com/watch?v=4KhJyEvD97s)).

15 years later, for sure it's not the most famous Linux distribution, nor the best documented. This explains that, and it could be far better about conviviality for newcomers. But it's definitely a good lightweight way to learn about Linux basics, intentionally maintained by a small core team.

Thus, there is an important focus on distributed development, and user freedom, which are key values for me. So I started learning to install it, on a PC/VM, thanks to my teammates and the community. I read the [official documentation](https://www.exherbolinux.org/docs/install-guide.html) and some guides ([Alexherbo's](https://alexherbo2.github.io/wiki/exherbo/install-guide/), [S0ddy's](https://gist.github.com/s0dyy/905be36b2c39fb8c14906e15c05c68a3)) to write [my own script](https://github.com/davlgd/exherbo-setup).

But my main goal was to learn using Exherbo's package manager, [Paludis](https://paludis.exherbolinux.org/index.html) and its client [Cave](https://paludis.exherbolinux.org/clients/cave.html) (some pronounce it "cawé"). Inspired by Portage, it's compatible with Gentoo, but opinionated on [some key differences](https://paludis.exherbolinux.org/faq/different.html).

What seduced me about this is how easy it is for anyone to create its own local or remote exheres repository, through git. Packages are also simple to create (kinda). They're `exheres-0` files: shell scripts with special functions to use and some conventions to follow. They often benefit of `exlib`, a set of libraries to help you write shorter/simpler `exheres-0` files.

- [Exheres for smarties](https://www.exherbolinux.org/docs/eapi/exheres-for-smarties.html) (a long, but complete guide)

So I started to make and use [my own packages](https://github.com/davlgd/exheres/tree/main).

## Your own package repository

The Exherbo official website [states](https://www.exherbolinux.org/docs/features.html) that :

> A small team is one that can adapt quickly to changes and keep focus on the philosophy of Exherbo. The downside to this is that a team of ~20 cannot maintain 2000+ packages. Exherbo solves this issue by offering robust distributed repository management, opting for many small repositories that integrate seamlessly with everyday management.

It's open source, give back to the community, contribute! The starting point is a [git local repository](https://next.ink/5730/apprenez-a-utiliser-git-bases-pour-suivre-evolution-dun-document/). At least it should contain:

- `metadata/`
  - `about.conf`: information about you and the repository
  - `categories.conf`: list of packages' categories used in the repository
  - `layout.conf`: parameters for the repository
- `profiles/`
  - `repo_name`: a file containing only the name of the repository

If you're not sure of the content of these files, just clone an existing exheres repository and adapt it. Mine is available [here](https://github.com/davlgd/exheres/tree/main).

In an Exherbo Linux system, you add a repository by creating a file in `/etc/paludis/repositories/` named `repo_name.conf` with the following content:

```bash
format = e
location = /var/db/paludis/repositories/repo_name
sync = git+file:///path/to/your/repo
sync_options = --branch=main
```

You can adapt the last line depending on your default branch name. If it's `master`, you can remove it. Once this is done, you can sync all your repositories, or only the one you just added:

```bash
cave sync
cave sync repo_name
```

Then, each time you make a new commit in your repository and `cave sync`, your new/updated packages will be available. If you want to access it from anywhere, you can push it to a remote git server (like Gitea, GitHub, GitLab, etc.) and edit your configuration file:

```bash
sync = git+https://your.git.server/repo.git local: git+file:///path/to/your/repo
```

Once done, you can sync from different source:

```bash
cave sync repo_name
cave sync -s local repo_name
cave sync --source local repo_name
```

## A simple package

As they're designed for a source-based distribution, Exherbo's packages are a kind of script containing metadata and multiple steps to get the source code, compile it, test the result, install it, and clean up.

Here I won't cover in detail how to create a complex package, I'll do that in a future post. On the contrary, I'll show you how simple it can be, with a Rust based example: [Static Web Server](https://static-web-server.net/). As it is available as [a crate](https://crates.io/crates/static-web-server), we can use `cargo` to build it and install it. And there is an `exlib` for that.

`cargo.exlib` [is available](https://gitlab.exherbo.org/exherbo/arbor/-/blob/master/exlibs/cargo.exlib) in the `arbor` repository, the main one for Exherbo Linux, included by design. So you don't have anything to do to use it, you can just `require` it in your `exheres-0` file. But first, let's create it.

The crate name is `static-web-server`, so the package name. As it's a web server, it will be in the [`www-servers`](https://summer.exherbolinux.org/packages/www-servers/index.html) category. We'll use the latest available version (2.28.0 at this time). So, we need to:

- Add `www-servers` to the `metadata/categories.conf` file
- Create a `packages/www-servers/static-web-server/` directory
- Create a `static-web-server-2.28.0.exheres-0` file in it

Now, what about the file content? It's quite simple. First, Copyright and License (you'll find official recommandations from Exherbo's team [here](https://www.exherbolinux.org/docs/eapi/exheres-for-smarties.html#copyright_lines)):

```bash
# Copyright 2024 your_name <your_email>
# Distributed under the terms of the GNU General Public License v2
```

Then, we include the `cargo` exlib and the minimum Rust version required, it will build/configure the application. We force the use of `github` exlib to get source code, as the `tests/` folder is not included in the crate archive, and we'll need it to run tests after build process:

```bash
require github [ force_git_clone=true tag=v${PV} ]
require cargo [ rust_minimum_version=1.74.0 ]
```

We configure the package (`${PN}` is a variable with the package name):

```bash
SUMMARY="A cross-platform, high-performance and asynchronous web server for static files-serving"
HOMEPAGE="https://${PN}.net/"

UPSTREAM_CHANGELOG="https://github.com/${PN}/${PN}/blob/master/CHANGELOG.md [[ lang = en ]]"

LICENCES="|| ( Apache-2.0 MIT )"
SLOT="0"
PLATFORMS="~amd64"

DEPENDENCIES=""
```

And... that's it! At installation time, Cave/Paludis will use the file name to get the crate name and version, the `cargo` exlib will do the rest. Save, commit (and push) this file to your repository. Then you can install it:

```bash
cave sync
cave resolve -x static-web-server
```

To make this package available more broadly, [you can push it](https://www.exherbolinux.org/docs/contributing.html) to an official Exherbo's repository, there is one [dedicated to Rust tools](https://gitlab.exherbo.org/exherbo/rust).

To go further and better learn how to create packages, look at those already available in the [official repositories](https://gitlab.exherbo.org/exherbo/), or in [the public packages list](https://summer.exherbolinux.org/).
