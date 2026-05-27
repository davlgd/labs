---
author: davlgd
pubDatetime: 2026-05-27T13:37:00Z
title: "Verne: I rewrote my blog's generator, in V"
description: "From Astro to Hugo to my own, in 22 hours"
tags:
  - V
  - Blog
  - Tools
  - Web
ogImage: /images/2026-05-verne-static-generator.webp
---

This blog ran on [Astro and the AstroPaper theme](/posts/2023-12-how-this-blog-was-built/) from December 2023. It worked, I upgraded it a dozen times, and by May I was on AstroPaper 5.5.1. Then in two days it moved to Hugo, and then to a static site generator I wrote myself. Here is how that happened, and why the second step was smaller than the first.

## Why leave Astro

Nothing was broken, which is the awkward part. AstroPaper is a good theme and Astro is a good framework.

The friction was everything around it. A `node_modules` to install before I could render three hundred lines of Markdown. Framework upgrades that arrived faster than my posts did. And a build that depended on an ecosystem I do not otherwise use, for a site that is text, a stylesheet and some images.

## Step one: Hugo, and a theme built from the old one

The first move was to Hugo, with a custom theme instead of an off-the-shelf one, because I wanted the site to look exactly as it did. I used [Claude Code](https://claude.com/claude-code) for the conversion: point it at the existing Astro templates and the rendered output, and have it produce Hugo templates that generate the same HTML from the same content files.

That is a good task for a coding agent. The specification is unambiguous, since the target output already exists and can be diffed, and the work is mechanical without being mindless.

The commit tells the story better than I can:

```text
feat: migrate from Astro to Hugo with custom terminal-garden theme
198 files changed, 2089 insertions(+), 20567 deletions(-)
```

Twenty thousand lines removed. Almost none of it was mine.

## Step two: writing the generator

Hugo lasted about twenty-two hours.

Once the templates existed and the content was plain Markdown with YAML frontmatter, the shape of the problem was visible: read files, parse frontmatter, sort by date, render templates, write HTML. Hugo does an enormous amount more than that, and I needed none of it.

So I wrote one, in [V](/posts/2024-02-how-own-web-server-vlang/), which is where I go for [small self-contained binaries](/posts/2024-10-21-how-to-create-a-cli-vlang/). The goal was narrow: produce byte-identical output to the Hugo build, from the same content and the same templates, and nothing else.

That constraint is what made it feasible. There was no design work, because the target was "whatever Hugo just did", and a diff told me when I was done.

The second migration commit is a fraction of the first:

```text
feat: migrate to Verne build tool and template
53 files changed, 524 insertions(+), 778 deletions(-)
hugo.yaml => verne.yaml
```

Most of it is that rename. The templates barely moved, since the syntax was deliberately close.

## What Verne is

[Verne](https://github.com/davlgd/verne) is a static site generator in V, published with a site of its own at [verne-ssg.org](https://www.verne-ssg.org) that is, of course, built with it.

The repository description is the whole joke: "The other static site generator named after a famous French author". There were already two. [Hugo](https://gohugo.io/) is Go and Victor Hugo, [Zola](https://www.getzola.org/) is Rust and Émile Zola, and Jules Verne was still available. If you want another Jules V. to read, try [Jules Vallès](https://en.wikipedia.org/wiki/Jules_Vall%C3%A8s).

The borrowing goes past the name, too. Zola's template engine is [Tera](https://keats.github.io/tera/), itself in the Jinja2 family, and Verne's syntax is a deliberate subset of it. A template from this blog looks like this:

```html
{% for s in site.footer_socials %}{% if not loop.first %} · {% endif %}<a href="{{ s.url }}">{{ s.label }}</a>{% endfor %}
```

Anyone who has written a Jinja2, Tera or Twig template can read that without documentation, which was the point.

The design goals are what I wanted from Hugo without the rest:

- **A single binary, small enough to not think about.** No Go toolchain, no Node, no asset pipeline. The 0.2.0 release runs 1.73 MB on macOS arm64, 2.05 MB on Linux arm64 and 2.31 MB on Linux x86_64.
- **A template language small enough to read in one sitting**: `{{ value | filter }}` for output, `{% statement %}` for control flow, and 21 filters that only display things. No arithmetic, no macros.
- **All the work at build time.** Aggregation, sorting and remote fetching happen during the build, so templates stay display-only.
- **A dev server with live reload**, watching content, themes, static files and configuration.

Themes came later, and those I generated with [Claude Design](https://claude.com/product/claude-design) before wiring them into the template system.

## Deploying it

The build produces a directory of files, so the hosting question answers itself. It runs on [Clever Cloud](https://www.clever-cloud.com/) with the [static runtime](https://developers.clever-cloud.com/doc/applications/static/), which serves a folder and nothing else.

The part worth stealing is how the build gets its tools. [mise](https://mise.jdx.dev/) has a [GitHub backend](https://mise.jdx.dev/dev-tools/backends/github.html) that installs release binaries straight from a repository, so the entire toolchain is two lines:

```toml
[tools]
"github:alecthomas/chroma" = "latest"
"github:davlgd/verne" = "latest"
```

No package to publish, no registry to wait for. Tag a release on GitHub and every machine that runs `mise install` gets it, including the build container. For a tool with one user that is exactly the right amount of distribution.

Scheduled publishing survived the move too, and it is still the [trick from 2024](/posts/2024-01-schedule-posts-astropaper/): a cron entry restarts the application, which rebuilds the site, and posts dated in the future appear when their time comes.

```json
["CRON_TZ=Europe/Paris 30 13 * * * clever restart --quiet --without-cache --app ${APP_ID}"]
```

And writing this post is how I found out that line is wrong.

`13:30` there is Paris time, so 11:30 UTC in summer. Every post is dated `13:37:00Z`, which is UTC. The rebuild therefore runs **two hours and seven minutes before** the post is due, sees a future date, and skips it. The post appears at the next day's rebuild, a day late, every time.

I had read `30 13` and `13:37` as seven minutes apart because they look it. They are in different timezones. The fix is to run the cron after the publication instant in UTC, or to stop mixing the two and date posts in Paris time as well.

## Was it worth it

For most people, no. Writing a static site generator to publish a blog is not a rational use of a weekend, and Hugo would have served me for years.

What I got is a build with no dependencies I do not control, a template language I can hold in my head, and a binary I can copy anywhere. What I gave up is every feature I have not written yet, and the certainty that someone else will fix the bugs.

The honest summary is that the Hugo step did the hard work. Getting from Astro to plain Markdown, YAML frontmatter and templates that render it took twenty thousand lines of deletions. Once a site is in that shape, replacing the thing that renders it is a small program. Verne exists because Hugo made it a small program.
