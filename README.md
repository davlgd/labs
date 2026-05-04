# davlgd tech blog

> **Requires [Verne](https://github.com/davlgd/Verne)** and the
> [`chroma`](https://github.com/alecthomas/chroma) command-line binary on
> `$PATH`.

This blog is a custom-designed static site running my own
[`terminal-garden`](themes/terminal-garden/) theme — a dark-first,
terminal-flavored design with typewriter hero, sticky TOC, command palette
(`⌘K` / `/`), contributions heatmap and live tag filter. Built with **Verne**
and hosted as a static website on
[Clever Cloud](https://www.clever-cloud.com).

## Stack

- **Generator**: [Verne](https://github.com/davlgd/Verne) — single binary, V
  language, mini-Tera template DSL, dual V/HTML shortcode model
- **Theme**: `terminal-garden` (lives in `themes/terminal-garden/`)
- **Content**: Markdown in `content/posts/` with `pubDatetime` frontmatter
- **Projects page**: data fetched from the GitHub API at build time
- **No JS framework**, no tracking, no analytics

## Local development

```bash
verne server      # dev server (rebuilds on first run, then serves ./public/)
verne build       # build for production
```

The site is then available at `http://localhost:1313`.

## Configuration

Site-wide config lives in [`verne.yaml`](verne.yaml):

- `params.handle`, `params.tagline`, `params.about` — site identity
- `params.socials` — links rendered in the footer
- `params.author` — name + Twitter/Bluesky handles for SEO meta
- `params.githubUser` / `params.projectsTopic` — projects page data source
- `params.defaultOgImage` — fallback OpenGraph image
- `params.themeColor` — accent color (also used by mobile browsers)

The `terminal-garden` theme reads everything from `params.*`; nothing is
hardcoded.

## Host as a static website on Clever Cloud

You'll need a Clever Cloud account to access
[the Console](https://console.clever-cloud.com) or use the CLI,
[Clever Tools](https://github.com/CleverCloud/clever-tools):

```bash
npm i -g clever-tools
clever login
```

Create a static application:

```bash
clever create -t static
```

Commit your changes, then deploy:

```bash
git add -A && git commit -m "your commit message"
clever deploy
```

### From GitHub

Linking your GitHub account to Clever Cloud enables automatic deployment
after each push on a specific branch (this is how this blog is published).

## Repository layout

```
.
├── content/
│   ├── about.md
│   ├── projects.md             # data-driven from GitHub API
│   ├── search.md
│   └── posts/
│       └── *.md
├── static/
│   ├── images/                 # post images served at /images/
│   └── og-default.png          # OpenGraph fallback
├── themes/terminal-garden/     # the custom theme
│   ├── assets/                 # CSS + JS (bundled & fingerprinted at build)
│   ├── static/fonts/
│   └── templates/              # Verne mini-Tera templates
├── clevercloud/cron.json       # weekly rebuild trigger
├── verne.yaml                  # site config
└── README.md
```

`legacy/` holds the previous Astro version of the blog, kept for reference.

## Theme: terminal-garden

A self-contained Verne theme built specifically for this blog. Highlights:

- Dark/light theme toggle with `localStorage` persistence (no flash on load)
- Command palette (`⌘K` / `/`) and vim-style nav (`g h`, `g l`, `g t`,
  `g p`)
- Reading-progress bar on articles, sticky TOC (auto-hidden when a post
  has no headings), animated reveal on scroll
- Contributions-style heatmap (rendered server-side from precomputed
  `site.heatmap_years`)
- Live tag filter on the homepage with stat recompute
- Code blocks with copy button, language label, Chroma-based syntax
  highlighting (palette retuned for terminal aesthetics)
- Glitch-on-hover for filenames in the post list
- Full SEO: canonical, OpenGraph, Twitter Cards, JSON-LD (`BlogPosting` +
  `WebSite` with `SearchAction`) — all precomputed in V
- CSS/JS bundled, minified, fingerprinted with Subresource Integrity (SRI)
- A11y: skip-to-content link, semantic `<main>`, `aria-label` on icon
  buttons
