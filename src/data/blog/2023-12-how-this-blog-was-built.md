---
author: davlgd
pubDatetime: 2023-12-29T13:37:00Z
title: How this blog was built
description: "Thanks to Astro, Clever Cloud and GitHub"
tags:
  - Astro
  - AstroPaper
  - Blog
  - GitHub
  - Tutorials
  - Web
ogImage: /src/assets/images/2023-12-build-technical-blog.webp
---

If I publish personal thoughts [on a blog](https://www.davlgd.fr/on-my-way-to-42.html) for several years, I've planned to post on a technical blog in English for quite some time. It's now done.

I'm a static website guy. Thus, one of my main concerns was to find an easy-to-use generator with a theme I liked. After a few tests this summer, I found [AstroPaper](https://github.com/satnaing/astro-paper) and it was (dark) love at first sight.

Astro is a great modern tool, easy to deploy. I cut trackers on this theme, and there is [a RSS feed](http://labs.davlgd.fr/rss.xml)! Of course, I tried it on [Clever Cloud](https://clever-cloud.com) in many ways and I'm now close to what I consider a perfect pipeline.

As my account is linked to GitHub, all I have to do is to edit my files and `git push` on the `main` branch. Less than 2 minutes later it's built and available online. If you want to know more, each step is explained [in the GitHub repository](https://github.com/davlgd/labs). And if you want to know more about how I host my other blog on an object storage service, take a look [here](https://github.com/davlgd/www.davlgd.fr).
