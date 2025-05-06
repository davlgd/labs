---
author: davlgd
pubDatetime: 2023-12-30T13:37:00Z
title: How I mirror my GitHub repositories on GitLab (thanks to Framagit)
description: "Publishing source code is good. Having a 3-2-1 backup system is better"
tags:
  - Framasoft
  - git
  - GitHub
  - GitLab
  - Tutorials
ogImage: /src/assets/images/2023-12-git-mirror.webp
---

For [more than 10 years](https://github.com/davlgd?tab=overview&from=2011-10-01&to=2011-10-31), I use git and I publish my open-source projects on GitHub. The platform is great, its tooling too. But I don't know what tomorrow will bring, especially for a service from Microsoft.

Thus, I prefer not to put all my eggs in one basket. So, some months ago I looked after an open-source alternative. I didn't want to rely only on my local repositories or on a self-hosted service. Of course, GitLab was one of the first to come to mind, but I needed a managed service.

I already use [Heptapod](https://heptapod.net/) at work (GitLab with Mercurial support), but in a personal context I mostly rely on [Framasoft](https://degooglisons-internet.org/en/). So, I finally chose to create an account on [Framagit](https://framagit.org). But once it's done, how to backup my repositories?

![Degoogleify Framasoft](/src/assets/images/2023-12-degoogleify-framasot.webp)

## Create a mirror repo with a GitLab push remote

There is a GitLab [Mirror option](https://docs.gitlab.com/ee/user/project/repository/mirror/), but I want to rely on a lower layer. Thus, on my main computer, I have `GitHub/` and `GitLab/` folders. In the first, I simply clone my repositories. In the second, I do the same using the `--mirror` flag. As stated in the official `git` [documentation](https://git-scm.com/docs/git-clone#Documentation/git-clone.txt---mirror):

> Set up a mirror of the source repository. This implies `--bare`. Compared to `--bare`, `--mirror` not only maps local branches of the source to local branches of the target, it maps all refs (including remote-tracking branches, notes etc.) and sets up a refspec configuration such that all these refs are overwritten by a `git remote update` in the target repository.

Then, I create an empty GitLab repository and use it as a push remote:

```bash
git clone --mirror https://github.com/user/repo.git
cd repo.git
git remote set-url --push gitlab git@framagit.org:user/repo.git
```

## Fetch/Push the content (via an alias)

To sync your mirror from its local folder, you only need to:

```bash
git fetch --prune && git push --mirror
```

You can use an alias declared in `.bashrc` or `.zshrc` to perform this sync action on multiple repositories from a single command:

```bash
function sync_git() {
  GITLAB_DIR="/path/to/gitlab/directory"

  # Declare an array of repo subdirectories
  declare -a REPO_DIRS=("repo1" "repo2" "repo3")

  # Go in each of them and sync
  for repo_dir in "${REPO_DIRS[@]}"; do
      echo "Entering ${GITLAB_DIR}/${repo_dir}.git"
      cd "${GITLAB_DIR}/${repo_dir}.git"

      git fetch --prune && git push --mirror

      echo
  done

  printf "%s \e[32m✓\e[0m\n" "Script completed"
}
```

After saving the file, reload your shell with `exec bash` or `exec zsh`.

## Go further

You can launch this command manually or on a regular basis through [CRON](https://fr.wikipedia.org/wiki/Cron) for example (but you'll need a git authentication not asking for a passphrase).

For my needs, I use this script in a more complete alias to update my system and tools (`brew`, `bun`, `npm`, `rustup`, `v`, etc.), with additional commands to clone some repositories I need to have locally, up to date.

## The most important

Don't forget [to support Framasoft](https://framasoft.org/fr/#support). This is how their great actions are funded, along with [services](https://degooglisons-internet.org/en/) such as Framagit.
