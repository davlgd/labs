---
author: davlgd
pubDatetime: 2024-01-20T13:37:00Z
title: Schedule article publication in an AstroPaper blog
description: Static is fantastic (sort of)
tags:
  - Astro
  - AstroPaper
  - Blog
  - Tutorials
  - Web
ogImage: /src/assets/images/2024-01-blog-post-planification-cron-astropaper.webp
---

As a tech editor, I used to write several articles a day. Most of the time, it was enough to prepare content to publish later. In some cases, I had to wait due to a NDA, requiring to hold off until a specific date/time.

Thus, my common practice is to batch-write stories when inspiration strikes, and then spread them out over time. It's also how I work on this blog. But as it's a static generated website, things aren't that simple.

## Static is... static

Why? Because it creates HTML files from Markdown content during deployment, applying a layout. If it's done on January 14th and you wrote an article for January 21st, it's built the same. And in AstroPaper theme, as in many others, the article will be displayed in the index and in many pages.

I therefore had to edit some files. First, I added a number variable called `scheduledPostMargin` in `src/config.ts` and `src/types.ts`. It contains a delay in milliseconds between the publication date/time of a post and when it should be displayed. We'll see later why and where this can help.

Next, I created a filter to apply after a JavaScript `map`: if a post is a draft or its publication date/time has not been reached, I consider it as a scheduled post and don't load it. There is one exception: if it's not a draft and the website is being previewed via the development server.

The snippet is:

```javascript
.filter(({ data }) => {
    const isPublishTimePassed =
    Date.now() > new Date(data.pubDatetime).getTime() - SITE.scheduledPostMargin;
    return !data.draft && (import.meta.env.DEV || isPublishTimePassed);
})
```

I added it to `src/utils/getSortedPosts.ts` and `src/utils/getUniqueTags.ts`. Thus, when Astro is looking for posts or tags, it doesn't load those that match scheduled content. I've also modified `src/pages/search.astro` to load posts from `getSortedPosts` and filter out those that are scheduled in the search.

The full commit is [here](https://github.com/davlgd/labs/commit/99d0bd98c750f62d1dd6652be738f1d37eb920a0). I proposed it as a [PR](https://github.com/satnaing/astro-paper/pull/234) on AstroPaper (since merged).

## Build when a new post is ready

Now, when the blog is built, scheduled content is created but not displayed anywhere. You must know the URL to access it. I didn't want to go any further because this allows me to check that everything is ok, share with some friends ahead of time and schedule posts on social networks.

When it's time to publish, I just have to ask for a rebuild of my application on Clever Cloud, and two minutes later, it's done. It's why `scheduledPostMargin`is required: to build before release time.

I also want to plan the restart of the application on a regular basis or at a specific date. Here I use [CRON](https://en.wikipedia.org/wiki/Cron). How to enable it will depend on your hosting platform. In Clever Cloud it's configured by [`clevercloud/cron.json`](https://developers.clever-cloud.com/doc/administrate/cron/).

It can be defined to launch a rebuild every weekday at 7h42 or next January 21st at 13h37, for example:

```json
["42 7 * * 1-5 $ROOT/rebuild.sh", "37 13 21 1 * $ROOT/rebuild.sh"]
```

There are few things to note here. First, the server time is UTC (France is UTC+1 or UTC+2). Second, `$ROOT` is not a variable as in a shell script. It's value that's replaced by the path to the application root when the crontab is built. Third, it's recommended to use a `login shell` script (starting with `#!/bin/bash -l`) to get access to the application's environment variables.

This is the one I use (don't forget to `chmod +x` it):

```bash
#!/bin/bash -l
clever link ${APP_ID}
clever restart --quiet --without-cache
```

For this to work I had to set some environment variables:

```bash
CLEVER_TOKEN: account token
CLEVER_SECRET: account secret
CC_OVERRIDE_BUILDCACHE: /dist:/clevercloud/cron.json:/rebuild.sh
```

Thus, `cron.json` and `rebuild.sh` will be present if the application is restarted from its cache. Thanks to `CLEVER_TOKEN` and `CLEVER_SECRET`, [`Clever Tools`](https://github.com/CleverCloud/clever-tools) can login and restart the application. If you need these values, just launch a `clever login`, you'll have to identify to obtain them in a browser.
