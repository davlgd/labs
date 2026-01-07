---
author: davlgd
pubDatetime: 2026-01-07T13:37:00Z
title: "jj: git without the staging area"
description: "Every change is a commit, and undo works"
tags:
  - git
  - Tools
ogImage: /images/2026-01-jj-version-control.webp
---

I have written before about [rewriting git history](/posts/2024-01-github-desktop-rewrite-history/) and how easy it is to get wrong. [Jujutsu](https://jj-vcs.github.io/jj/) takes a different route: it keeps git's storage and replaces the model on top of it. After a few weeks with 0.36, two of its ideas have stuck with me.

## It sits on top of your git repository

No migration, no second copy:

```bash
$ git init

$ jj git init --colocate
Initialized repo in "."
```

`--colocate` means the directory is a working jj repo *and* a working git repo at the same time. Your colleagues clone it with git and never know. Your tooling keeps working. If you dislike it, `rm -rf .jj` and nothing is lost.

That lowers the cost of trying it to about zero, and it is why I did.

## There is no staging area, because the working copy is a commit

This is the idea everything else follows from. In jj, your uncommitted work *is* a commit, always:

```bash
$ jj log -r @
@  nkzkrqnu test@example.com 2026-01-07 14:29:17 799678e8
│  (empty) (no description set)
```

An empty commit with no description, waiting. Edit a file and it is already in there:

```bash
$ echo "bonjour" > a.txt

$ jj status
Working copy changes:
A a.txt
Working copy  (@) : nkzkrqnu c2e51302 (no description set)
Parent commit (@-): zzzzzzzz 00000000 (empty)
```

No `jj add`. There is nothing to add it to, since it is already part of the change. When you are happy, you describe it and start a new one:

```bash
$ jj describe -m "add a.txt"

$ jj new -m "second change"
```

`git add`, `git stash` and the entire index disappear from your vocabulary. Whether that is a loss depends on how much you liked partial staging, which jj handles differently with `jj split`.

## Rewriting history stops being frightening

Here is the part that sold me. Three changes stacked, and I want to reword the first one:

```bash
$ jj describe nkzkrqnu -m "add a.txt (reworded)"
Rebased 2 descendant commits
Working copy  (@) now at: lvrrwwqy 2b5d2854 third change
```

`Rebased 2 descendant commits`. No interactive rebase, no detached HEAD, no editor listing `pick` lines. I named an old change, changed it, and everything built on top moved with it automatically.

That works because a change has a stable **change ID** (`nkzkrqnu`) separate from its commit hash. Rewriting produces a new hash, and the change ID stays, so jj knows what the descendants were built on and where to put them.

## Undo, which git never really had

```bash
$ jj undo
Restored to operation: 2bd04c6434ee snapshot working copy
```

The reword is gone and the log reads as it did before. jj records every operation on the repository in an oplog, and `jj undo` steps back through it. Not "undo a commit": undo the last *thing you did*, whatever it was, including a rebase or an abandon.

git has `reflog`, and anyone who has recovered work with it knows it is a forensic tool and not an undo button. This is an undo button.

## What it costs

Version 0.36 is not 1.0, and the version number is honest about it: things move between releases and the documentation lags in places.

The bigger cost is your own habits. Every git reflex has an equivalent, and none of them is spelled the same. `jj log` shows a graph of changes instead of a linear history. Branches are called bookmarks and do not move on their own. `jj git push` exists but you have to think about what it is pushing.

And there is no useful GUI or IDE integration yet, so it is the terminal or nothing.

I have not stopped using git, and colocation means I do not have to choose per repository, only per session. For a stack of changes I know I will reshuffle, jj wins outright. For everything else, muscle memory still wins. A fair description of where the tool is right now.
