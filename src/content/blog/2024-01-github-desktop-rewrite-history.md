---
author: davlgd
pubDatetime: 2024-01-14T13:37:00Z
title: GitHub Desktop became my best friend to rewrite (git) history
description: Never do that... until you do it
tags:
  - git
  - GitHub
  - Tutorials
ogImage: /src/assets/images/2024-01-github-desktop.webp
---

I love `git`. Versioning things is key in my world and `git` made this popular, distributed, thanks to [Merkle trees](https://next.ink/4998/de-git-a-bitcoin-en-passant-par-ipfs-derriere-foret-decentralisation-arbres-merkle/) (among others). But it's complicated too. You must practice a lot to really master such a tool.

And when you're good enough to think you have it, you suddenly realize you're way off the mark. The good thing is, though, that you are constantly amazed by the new things & tricks you discover (`jq` does this to me, too).

![git versioning](@assets/images/2024-01-git-versioning.webp)

## Master `git` your way

But on a daily basis, you want to be efficient. Unfortunately, my brain is not when it has to deal with a whole bunch of arguments, flags and their potential combinations in order to get out of a complex situation.

Thus, I tend to look for palliatives to balance things out. One is to use a graphical interface (GUI) for `git`. There are lots of them out there, but as I just said, I'm a [KISS](https://en.wikipedia.org/wiki/KISS_principle) made man. As I participate on several (personal and work) projects on GitHub, I use their [Desktop client](https://desktop.github.com/) which has the advantage of being [open source](https://github.com/desktop/desktop) and cross-platform (so do I).

For some `git` actions [I prefer to use command line](2023-12-github-gitlab-framagit) or an [IDE](https://en.wikipedia.org/wiki/Integrated_development_environment). On the other hand, to open a repository, select a branch, commit and pull/push, GitHub Desktop is often my swiftest way to do things. And recently, I discovered it could help me with one of my favorite activities: rewriting `git` history.

![Git: squash your commits!](@assets/images/2024-01-git-squash.webp)

## Squash you commits (but reorder them first)

Let's be clear: revising `git` history is usually a bad move, especially for teamwork because it breaks the dynamics of distributed projects. But it can be helpful in some cases or when you're dealing with your own branch. In fact, I almost do this only for one thing: keep my `git` history clean.

When I use `git`, I regularly commit to track changes and push on a remote to save my work. But when it's time to understand what has been done, or to prepare a merge request, such a behavior sucks. There is a rule for that: "_squash your commits!_". Basically, it's about merging several commits and describing the changes made on your files in a single step.

It could be done with an interactive rebase (`git rebase -i <commit_hash>`), but you sometimes need to rearrange commits first, amend/undo something, select only some lines for a commit, keep the others for a next one. It's where GitHub Desktop helps... a lot! You can do all this in a graphical way:

![GitHub Desktop Rewriting git history](@assets/images/2024-01-github-desktop-capture.webp)

If you avoid modifying the same files in multiple commits, you can reorganize and merge them at your convenience. If you already pushed before, you'll certainly need to `git push --force` on the remote (if your allowed to).

And you do you have some `git` CLI/GUI tricks? Let me know!

---

P.S.: As I said at the beginning of this blog post, there are lots of [`git` GUIs](https://alternativeto.net/software/github-desktop/) on the market. I'm not promoting GitHub Desktop as the ultimate solution here, just explaining how I use it and how it can save time to keep away from the CLI when you need to do tricky things. Find your favorite tools, let people know, explain why and how they help you. Share love ❤️
