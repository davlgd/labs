---
author: davlgd
pubDatetime: 2026-02-18T13:37:00Z
title: "zellij: a multiplexer that tells you the shortcuts"
description: "Layouts in a file, not a script"
tags:
  - Shell
  - Tools
ogImage: /images/2026-02-zellij-multiplexer.webp
---

Terminal multiplexers have a reputation problem. `tmux` is excellent and everyone learns exactly four of its keybindings, because finding the fifth means reading a manual. [Zellij](https://zellij.dev/) starts from the opposite assumption: the shortcuts are on screen, and the configuration is a document rather than a script.

## The status bar is the manual

Start it and the bottom of the screen lists what you can press, changing as you enter each mode. That sounds cosmetic and it is the single biggest difference in practice: you discover the tool by using it, and the tutorial is the interface.

If you already have `tmux` fingers, there is a `tmux` keybinding preset, so `Ctrl-b` behaves as you expect while you decide.

## Layouts are files

This is where it separates itself. A tmux layout is a script: a sequence of `split-window` and `send-keys` calls that builds the arrangement step by step. In zellij it is a description, in KDL:

```kdl
layout {
    pane split_direction="vertical" {
        pane
        pane split_direction="horizontal" {
            pane command="tail" {
                args "-f" "/var/log/system.log"
            }
            pane
        }
    }
}
```

Nesting is nesting, a pane that runs a command says so, and the file reads as the shape it produces. `zellij --layout dev.kdl` opens it.

The interface itself is built from the same primitives, which you can see by dumping the default:

```bash
$ zellij setup --dump-layout default
layout {
    pane size=1 borderless=true {
        plugin location="tab-bar"
    }
    pane
    pane size=1 borderless=true {
        plugin location="status-bar"
    }
}
```

The tab bar and the status bar are **plugins in panes**. There is no special-cased chrome: the UI is made of the same things your layouts are made of, so replacing it is a matter of writing a layout instead of patching the program.

## It is scriptable from outside

`zellij action` drives a running session from another terminal:

```bash
zellij action new-pane
zellij action dump-screen /tmp/out.txt
zellij action edit-scrollback
zellij action close-pane
```

`dump-screen` is the one I keep using: capture what a pane currently shows, into a file, from a script. And `edit-scrollback` opens the pane's history in your editor, which beats scrolling and copying.

## Sessions, as you would expect

```bash
$ zellij list-sessions
No active zellij sessions found.
```

Named sessions, detach and reattach, resurrection of a session whose processes have exited. The mental model matches tmux closely enough that the migration is about keys and configuration, not concepts.

## What it costs

It is written in Rust and it is heavier than tmux, in memory and in startup. On a laptop this does not matter. On a box where you keep fifty sessions open it might, and tmux remains the leaner tool.

It is also not everywhere. tmux is in every distribution's base repositories and frequently already installed on a server you did not set up. zellij you install deliberately, which makes it a poor fit for the "SSH into an unfamiliar machine" case that multiplexers exist for. That one is still tmux, or `screen` if the machine is old enough.

Version 0.43.1 is what I am running here, and the leading zero is not decoration: configuration format and plugin API have both moved between minor releases. Pin the version in anything shared.

Where it wins outright is the project you return to daily. One layout file in the repository, `zellij --layout dev.kdl`, and everyone on the team gets the same four panes with the same things running in them. Committing that file is the actual feature.
