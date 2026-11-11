---
author: davlgd
pubDatetime: 2026-11-11T13:37:00Z
title: What's coming in Git 3.0
description: "Two releases to go"
tags:
  - git
  - Tools
ogImage: /images/2026-11-git-3-breaking-changes.webp
---

Git 2.56.1 came out yesterday with fixes for six CVEs, and you should update. But the real news is elsewhere, at the top of the [draft notes for the next release](https://github.com/git/git/blob/master/Documentation/RelNotes/2.98.0.adoc). That release will not be 2.57 but 2.98, and it is described as the antepenultimate one before Git 3.0.

So: 2.98, 2.99, 3.0. The [plan from the contributor summit](https://about.gitlab.com/blog/whats-new-in-git-2-56-0/) is 2.98 in December, then 2.99 and 3.0 together in spring 2027. The last time Git broke compatibility on purpose was 2.0, in May 2014. Time to look at what is on the list.

## New defaults, and a few removals

Everything is in one file of the Git sources, [BreakingChanges](https://git-scm.com/docs/BreakingChanges). Three items only affect what `git init` does, so your existing repositories keep their format:

- the first branch is named `main`
- references are stored in the reftable format, not as one file per branch
- objects are hashed with SHA-256, not SHA-1

A fourth applies everywhere: a bare repository found by walking up the directory tree is refused, unless you name it.

Then come the removals: `git whatchanged`, `git pack-redundant`, grafts, the `.git/branches/` and `.git/remotes/` directories, and a few options nobody should miss. Last item, for those who package Git and not for those who use it: building it will require Rust.

## You can run it today

The list is not a promise, it is code. Almost all of these changes are already in the sources, behind a compile-time switch. Here is 2.56.1 built with it on Debian 13, `cargo` installed:

```bash
make -j4 prefix=/opt/git3 WITH_BREAKING_CHANGES=YesPlease \
  NO_TCLTK=1 NO_PERL=1 NO_PYTHON=1 install
```

`prefix` keeps it apart from the system's Git, and the `NO_*` flags skip parts this test does not need. The binary says what it was built for:

```bash
$ /opt/git3/bin/git version --build-options | grep default
default-ref-format: reftable
default-hash: sha256
```

With that binary first in the `PATH`, a new repository looks like this:

```bash
$ git init demo
hint: Using 'main' as the name for the initial branch since Git 3.0.
hint: If you expected Git to create 'master', the just-created
hint: branch can be renamed via this command:
hint:
hint: 	git branch -m master
hint:
hint: Disable this message with "git config set advice.defaultBranchName false"
Initialized empty Git repository in /root/g5/demo/.git/
```

The hint has changed sides: it used to explain how to pick another name, it now explains how to get `master` back, for those who miss it.

## Your prompt reads .git/HEAD

Reftable is the change most likely to break something of yours, because of what it does to files many tools read directly:

```bash
$ cd demo
$ git commit -q --allow-empty -m first

$ git branch --show-current
main

$ cat .git/HEAD
ref: refs/heads/.invalid

$ cat .git/refs/heads
this repository uses the reftable format

$ ls .git/reftable
0x000000000001-0x000000000002-896ff94b.ref
tables.list
```

`.git/HEAD` is a decoy and `refs/heads` is a file, no longer a directory. Anything that reads `.git/HEAD` itself to find the branch, or lists `.git/refs/heads/`, gets garbage: a shell prompt, an editor plugin, a CI script. The fix is to ask Git: `git branch --show-current`.

The reasons are good ones. Two branches differing only by case can coexist on macOS and Windows, deleting a reference no longer rewrites a whole `packed-refs` file, and updates of several references become atomic.

## SHA-256, announced but not there yet

This is where the build is surprising. It claims `default-hash: sha256`, and yet:

```bash
$ git rev-parse --show-ref-format --show-object-format
reftable
sha1
```

In 2.56.1, the switch moves references but the new hash is not wired into `git init`. It still creates SHA-1 repositories. You have to ask:

```bash
$ cd ..
$ git init -q --object-format=sha256 future
$ cd future
$ git commit -q --allow-empty -m first

$ git rev-parse HEAD
6b968f7a6cc72dbba0f69a1cd77ed070ed24a9ced927d787132c8e002af1e4c8

$ git fetch ../demo
fatal: mismatched algorithms: client sha256; server sha1
```

64 characters, and a wall. Git's manual says the two formats do not interoperate at present, and the breaking-changes document makes ecosystem support a requirement for moving the default.

The ecosystem is half there. GitLab already takes SHA-256 repositories. GitHub announced a private beta in September, after a [request](https://github.com/orgs/community/discussions/12490) open since 2022.

Scott Chacon, co-founder of GitHub and GitButler, [argues](https://blog.gitbutler.com/git-3-sha-256) that the whole move costs far more than it brings. This is the item to watch.

## What disappears

The removals are easier to judge:

```bash
$ git whatchanged
git: 'whatchanged' is not a git command. See 'git --help'.

$ git pack-redundant --all
git: 'pack-redundant' is not a git command. See 'git --help'.
```

`git log --raw --no-merges` replaces the first. If you never typed the second, join the club.

The bare repository rule is a security fix in disguise. A repository you clone can contain a bare one, with hooks of its own, waiting for you to `cd` into it:

```bash
$ cd ..
$ git init -q --bare vendor.git
$ cd vendor.git

$ git log
fatal: cannot use bare repository '/root/g5/vendor.git' (safe.bareRepository is 'explicit')

$ cd ..
$ git --git-dir=vendor.git rev-parse --is-bare-repository
true
```

Git 3.0 refuses to find it by accident, and still works when you name it.

## Preparing with the Git you have

Nothing here needs 3.0. On Debian's Git 2.47, three settings give you the future behaviour:

```bash
git config --global init.defaultBranch main
git config --global init.defaultRefFormat reftable
git config --global safe.bareRepository explicit
```

An existing repository can be converted with `git refs migrate --ref-format=reftable`. It worked with Git 2.54 on macOS, and 2.47 answered `migrating reflogs is not supported yet`. 2.98 renames the second setting to `init.defaultRefStorageFormat`, and keeps the old spelling as an alias.

And if you want none of it, the same settings work the other way: `master`, `files`, and `all`.

Keep in mind what was tested: 2.56.1 with a switch, not 3.0. The list can still change, and the document itself says the Rust requirement may be postponed. But the release notes have started counting, and two releases are not a long time to fix a prompt.

## Meanwhile, everybody rethinks Git

This list lands at an odd time. With agents opening dozens of branches and pull requests a day per developer, everyone expects version control to change. Git first, since everybody uses it.

Attempts are everywhere. [Jujutsu](https://github.com/jj-vcs/jj) rethinks commands and workflow on top of Git's storage. GitHub [rebuilt its storage layer](https://x.com/github/status/2118830274431873379), tested with 5,000 agents pushing to a single repository. Cursor [bought Graphite](https://cursor.com/blog/graphite), and Zed has [Delta](https://zed.dev/blog/delta-public-beta) in beta, to record what happens between commits.

Some go further and build around a central server. Anthropic [replaced Git](https://www.anthropic.com/engineering/redesigning-source-control) for its own monorepo with Scion, where commits, merges and rebases happen on the server. It says Scion is no general replacement for Git, and does not offer it.

Still, that is the direction I would hate to see this moment take: each vendor recentralizing around itself a tool that, like the Internet, owes its strength to being fully distributed.

Git will not be replaced overnight anyway. Developers know it and so do their agents, even if few of either master all of it. Habits like that take years to change.

That should not make its maintainers too comfortable. A branch name, a ref format and a new hash change how Git stores things, not how we work with it. I hope they listen to what all these attempts say, and that the next list is bolder.
