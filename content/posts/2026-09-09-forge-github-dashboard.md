---
author: davlgd
pubDatetime: 2026-09-09T13:37:00Z
title: "Forge: my personal GitHub dashboard you can use"
description: "What needs me, on one screen"
tags:
  - GitHub
  - Web
  - Tools
ogImage: /images/2026-09-forge-github-dashboard.webp
---

I own about 140 repositories on GitHub, plus the ones I follow in a few organizations. I read my notifications regularly, but they show what's new, not the issue or pull request I forgot three weeks ago. And GitHub doesn't offer one central place where I can move between all of it, sorted and filtered the way I need. So I built my own.

[Forge](https://github.com/davlgd/forge) brings my repositories, issues and pull requests into one place, for my account or any organization I belong to. I see what's waiting, I open it on GitHub, I deal with it.

![Forge in dark mode, showing workspace statistics, open conversations and popular repositories with fictional demo data](/images/2026-09-forge-dashboard.webp)

## A need, and a library in a drawer

The idea was simple: sign in, and see at a glance my repos, some global stats, the popular ones, and above all those with open issues or pull requests. Then go and deal with them faster.

I wrote it in Rust to get it easy to launch and deploy as a single binary. But also to reuse [github-rust](https://github.com/davlgd/github-rust), a client I wrote for my tools to discover exciting new repositories. It can be used as a local tool, based on the [GitHub CLI](https://cli.github.com/) token, or through a GitHub OAuth.

Why build this at all, when there are dashboards everywhere? Because none of them fit my needs. And a tool I use every day is the kind of project where I learn the most. So let's code it.

## The first version wasn't a tool

The first version had a dark theme following the system, some statistics and a list of repositories. It looked fine. It wasn't useful.

There were filters named "Needs attention", "Sources" and "Forks", and I couldn't tell what they did. Filtering on issues showed me the same list of repositories, with a link to each repository and not even to its issues.

It was a dashboard and a list of repositories with several levels of filters, not a tool answering the goal. Even for an MVP, that was disappointing. The data was on screen, but I couldn't act on it. From there, issues and pull requests became real inboxes, each line a conversation you open on GitHub, and every heading states what it counts.

## Show me something, now

The next problem was waiting. Repositories, issues and pull requests each had their own cache, so every view started from scratch. Forge now does the opposite: it fetches everything when the cache is empty or stale, whatever the section, shows items as they arrive, and starts with the page you're looking at. The result is a stream.

`/api/sync` sends newline-delimited JSON, one frame per batch, and the browser renders each one as it lands. Once installed (see below), the demo mode shows it without any GitHub account:

```bash
$ DASHBOARD_AUTH=demo forge

# in another terminal: ask for pull requests first
$ curl -sN 'http://localhost:8080/api/sync?priority=prs' \
    | jq -r '[.type, .kind // .section // empty] | join(" ")'
context
repositories
work-items prs
repositories
work-items prs
repositories
work-items prs
repositories
work-items prs
section-complete repositories
section-complete prs
work-items issues
work-items issues
work-items issues
section-complete issues
complete
```

It's not perfect, but enough for now. Pull requests come interleaved with repositories, issues fill in behind. A section stays marked incomplete until its `section-complete` frame arrives, so a half-loaded list never passes for an empty one.

## Questions before features

Then came the questions that matter once a tool leaves your laptop. Who calls GitHub, the server or the browser? What happens with several users at once? Is it viable in production?

The server does, and it keeps a 30-minute cache per credential and per workspace, adjustable with an environment variable. Every setting or magic number lives in a single `src/config.rs`.

Once deployed, reloading the page refreshed the cache. It shouldn't. Now a reload replays the snapshot after an identity check, and only the **Refresh** button goes back to GitHub. On my account (with big orgs/repos), a cold sync takes about 9.5 seconds, the replay half a second.

My own instance runs on [Clever Cloud](https://www.clever.cloud/), behind [OAuth2 Proxy](https://www.clever.cloud/developers/doc/develop/oauth2-proxy/), with me as the only allowed user. I didn't want a proxy login page in front of it, so it goes straight to GitHub's.

## The library grew up along the way, what's next?

Meanwhile, github-rust took in what Forge needed, welcome release 0.2.0. And after some fixes, 0.2.3 was released. This is one of the parts I enjoy most, tools completing each other's work.

By the way, Forge is not my final goal here. Centralizing projects, repos, issues, what to do across one platform is an interesting step. But I'm more looking at solutions that work across platforms and that help to get the work done more than just expose a kind of big TODO list. Let's discuss that later ;)

## Test it

Forge releases are on GitHub, so [mise](https://mise.jdx.dev/) installs Forge the way it installs [my other tools](/posts/2026-05-27-verne-static-site-generator/). I tested it on macOS, and on Debian and Alpine through [drc](https://github.com/davlgd/drc), feel free to do the same:

```bash
$ mise use -g github:davlgd/forge
$ gh auth login

$ forge
2026-09-06T21:08:37.091074Z  INFO github_dashboard: Forge listening on http://0.0.0.0:8080
```

Open `http://localhost:8080`. No configuration file, no database, and the token comes from GitHub CLI, so there's no secret to store. `DASHBOARD_AUTH=demo forge` fills the same interface with fictional data if you want a look first.

If a feature or a view is missing, [issues](https://github.com/davlgd/forge/issues) are open 😉
