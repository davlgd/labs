---
author: davlgd
pubDatetime: 2024-01-24T13:37:00Z
title: "EasyGit: a git server… based on iCloud Drive"
description: How simple is that?
tags:
  - git
  - Apple
  - Tools
ogImage: /src/assets/images/2024-01-apple-storage-git.webp
---

You know how I love [git](/tags/git). In recent years, it has become the go-to [CVS](https://en.wikipedia.org/wiki/Concurrent_Versions_System) for developers around the world. It’s fully distributed: anyone can act as a client or a server. But in most cases, we rely on external services such as GitHub, hosted GitLab, Gitea, etc. Humans remain gregarious creatures.

But some developers looked for ways to integrate git with another kind of platforms, more and more popular in recent years: Cloud storage services. It’s where I discovered [EasyGit](https://easygit.app/), a free to use solution that combines the power of git with the convenience of… iCloud Drive.

- [EasyGit on the Mac App Store](https://apps.apple.com/fr/app/easygit/id1228242832?mt=12)

## git server made easy…

Once installed, there’s nothing to do. Launch the application in a user session connected to an Apple account with iCloud Drive, that’s it!.

You can create a new local repository, EasyGit will host it and make it available through a `git://localhost/repo_name` URL. It works as any other repo: you can clone it, commit, push, create branches, add other remotes. EasyGit also offers to back it up as a copy folder with its `Save as` feature.

![EasyGit Interface](/src/images/2024-01-easygit-interface.webp)

The only difference, except how easy it is to use, is that EasyGit repositories are synced through your iCloud Drive account. It’s where the git server data lives. Thus, install the tool on another Mac with the same Apple account and you’ll find the same repositories to clone and use.

## … in an Apple context

Of course, you can also work with teammates and invite them as Contributor with a message or AirDrop. It will send them a link to iCloud Drive.

Here is the only “issue”: EasyGit eliminates the need for server setup and allows seamless integration with existing workflows, but only in an Apple centric world. So it’s fine for personal use or if it’s how your team works. But if some use Linux or Windows, you’ll have to add other remotes.

I also regret it can't be launched as a background service at startup.
