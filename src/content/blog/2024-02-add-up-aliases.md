---
author: davlgd
pubDatetime: 2024-02-03T13:37:00Z
title: "Put an ‘up’ alias in your life (to start with)"
description: "And launch it as often as you want"
tags:
  - Alias
  - Shell
  - Tutorials
ogImage: /src/assets/images/2024-02-update-sky.webp
---

I’m an update junkie. I like my system and my applications to be up to date. In the new mobile « App Store » centric approach to the world, it’s quite simple. But that word is too bland and centralized to please me. I’m more of a terminal, scripts & packages manager guy. So, how do I update my desktop ?

## Update everything with a short command

On GNU/Linux and macOS I rely on aliases for this kind of stuff. My Shell is `zsh`, but it works to with `bash`, `fish` or whatever. And the most important alias to me is `up`. It’s the one I use to update all the things and launch actions I need to do on a regular basis to feel nice.

To do the same, edit your `~/.zshrc` (or the file used by your Shell) and add:

```bash
alias up='update && commands && you && want && to && use'
```

Once saved, run `exec zsh` or `source ~/.zshrc`. The `up` command is now available and will be when a new `zsh` Shell is started.

For example, on Ubuntu I often add this `up` alias:

```bash
alias up='sudo apt update && \
  sudo apt full-upgrade -y && \
  sudo apt autoremove && \
  sudo snap refresh'
```

It updates the system, Snaps and clean unnecessary packages.

## Feel free, add complexity

But you can go further and make it more complex by adding third-party packages managers, backup actions, etc.

For example my `up` alias on a daily used macOS system is:

```bash
up() {
  softwareupdate --install --all # macOS CLI updater
  brew update
  brew upgrade
  brew cleanup --prune=all -s
  bun upgrade
  npm update -g
  rustup update
  v up
  sync_git # A personal sync git repo function
}
```

As you can see here, it’s on multiple lines and declared as a function to be more readable. You can add variables, other functions and more complex Shell stuff tp such aliases. For example add a function call to `git pull` some repositories or update [your mirrors](/posts/2023-12-github-gitlab-framagit/) (yes, I do that).

You can then run `up` on a regular basis through CRON or other mechanisms, and log outputs to check if anything went wrong. I prefer to launch it manually when I want to be sure everything is up to date (sometimes more than once© a day)… but I have a compulsive disorder about that.

## Aliases are the spice of life

Of course, you can improve your life by multiplying the aliases you use, making commands shorter and smarter. Creating `dotfiles` and sharing them. But it's another story, I’ll cover that in a futre blog post.

Nonetheless, here are some of my favorite aliases. And my personal advice: ask ChaGPT for new ideas, it’s good at this game. And it’s an interesting way to benchmark developers focused LLM 😏

```bash
# One letter is enough
alias c='ncal -ws FR'
alias f='find / -type f -name 2> /dev/null'
alias h='history | grep'
alias u='du -hsx * | sort -rh'
# Replace `pbcopy` with the copy/paste tool of your choice
alias pgen='gpg --gen-random --armor 2 32 | pbcopy'
alias serve='python3 -m http.server'
# Lots of git focused aliases
alias gl='git log --oneline --all --graph --decorate'
alias gac='git add . && git commit -m'
alias gst='git status'
alias gsw='git switch'
alias gri='git rebase -i'
alias dclean='docker ps -aq | xargs -r docker rm -f && docker images -q | xargs -r docker rmi -f'
# My Clever Cloud Fast deploy command
alias ccfd='git add . && git commit -m "Fast deploy" && \
  clever deploy && clever open'

checksite() {
    if curl --output /dev/null --silent --head --fail $1; then
        echo "$1 is online"
    else
        echo "$1 is offline"
    fi
}

mkcd() {
    mkdir -p $1
    cd $1
}

w() {
    if [[ "$2" == "--full" ]]; then
        curl "wttr.in/$1"
    else
        curl "wttr.in/$1?format=2"
    fi
}
```
