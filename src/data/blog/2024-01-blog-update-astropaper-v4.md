---
author: davlgd
pubDatetime: 2024-01-13T21:42:00Z
title: How I've upgraded this blog to Astro(Paper) 4.0
description: New year, new blog... and already a new version
tags:
  - Astro
  - AstroPaper
  - Blog
  - Tutorials
  - Web
ogImage: /src/assets/images/2024-01-astropaper-v4.webp
---

Some weeks ago, I decided [to launch this tech blog](/posts/2023-12-how-this-blog-was-built) based on the AstroPaper theme. After the release of Astro 4.0, it's been upgraded with VS Code snippets, `modDatetime` and `slug` support, packages updates, share buttons, back to top link, fixes, etc. You can learn more [here](https://astro-paper.pages.dev/posts/astro-paper-v4/).

So, I decided to make the move. As it's a static blog with no 1-click process, I had to follow manual steps. First, backup some folders and files. I thank my idea to create [a commit](https://github.com/davlgd/labs/commit/6bd928bb5a83a0f442419ca49754d16e14847303) with items modified during configuration:

- `src/assets`
- `src/components/Header.astro`
- `src/config.ts`
- `src/content/blog`
- `src/layouts/Layout.astro`
- `src/pages/about.md`
- `src/pages/index.astro`
- `tailwind.config.cjs`

After that, I deleted all the content except `.git` and launched the AstroPaper create process in a new folder:

```bash
npm create astro@latest -- --template satnaing/astro-paper
```

I took all the files/folders created and moved them to the (almost) empty repository. Again, versioning helps and I was able to easily check each modified item in VS Code (but you can do it with any `git` GUI).

Then, I reverted unwanted changes to recover the assets, config and content. I was ready for a final check with a local HTTP dev server:

```bash
npm run dev
```

As everything was fine, I created [a new commit](https://github.com/davlgd/labs/commit/3a541ceb159f54dcb9e32a11b840f0222faf9080) and pushed it. The blog post you're reading is on AstroPaper v4! The next step is to review a few more settings, like the new social icons or custom share buttons.

Maybe tommorow.
