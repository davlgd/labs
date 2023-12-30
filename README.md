# davlgd tech blog

This blog is based on [`AstroPaper`](https://github.com/satnaing/astro-paper) theme, built & hosted as a static website on [Clever Cloud](https://www.clever-cloud.com).

## Create your own AstroPaper blog

You'll need `Node.js` to init such a project. It will create you a new folder and, if asked, a local git repository:

```node
npm create astro@latest -- --template satnaing/astro-paper
or
yarn create astro --template satnaing/astro-paper
```

You can use some options if needed:

```
       --template <name>  Specify your template.
--install / --no-install  Install dependencies (or not).
        --git / --no-git  Initialize git repo (or not).
              --yes (-y)  Skip all prompts by accepting defaults.
               --no (-n)  Skip all prompts by declining defaults.
               --dry-run  Walk through steps without executing.
          --skip-houston  Skip Houston animation.
                   --ref  Choose astro branch (default: latest).
                 --fancy  Enable full Unicode support for Windows.
   --typescript <option>  TypeScript option: strict | strictest | relaxed.
```

For example for this blog I used:

```node
yarn create astro --template satnaing/astro-paper labs --no-install --git --typescript relaxed -y
```

Note: it will work the same with most of Astro themes.

## Configure blog, edit content

To configure and use this blog/theme, you can:

- Change parameters in [src/config.ts](src/config.ts)
- Edit markdown pages/posts in [src/content/](src/content/)
- Edit index file content in [src/pages/index.astro](src/pages/index.astro)

You can go further thanks to [Astro documentation](https://docs.astro.build/en/core-concepts/project-structure/) and [AstroPaper documentation](https://github.com/satnaing/astro-paper?tab=readme-ov-file#-documentation).

To check the generated website, launch `npm run start`. It will be available at `https://localhost:4321`.

## Host as a static website on Clever Cloud

You'll need a Clever Cloud account to access [the Console](https://console.clever-cloud.com) or to use the CLI, [Clever Tools](https://github.com/CleverCloud/clever-tools):

```bash
npm i -g clever-tools
clever login
```

First, create a static application, the CLI command is:

```bash
clever create -t static-apache myBlog
```

As a PaaS platform, a deployment on Clever Cloud starts with a build phase, where the static website will be generated. The, it will be hosted through an Apache Web Server with HTTPS acces (thanks to the [Sōzu load balancer](https://github.com/sozu-proxy/sozu)). No external runner such as GitHub Action is needed.

Thus, you need to configure the build phase. It's as easy as declare environment variables:

```bash
clever scale --flavor nano    # A tiny instance is enough for static blog
clever scale --build-flavor M # A bigger instance to quickly build the website

clever env set CC_WEBROOT "/dist"
clever env set CC_OVERRIDE_BUILDCACHE "/dist"
clever env set CC_NODE_VERSION "20"
clever env set CC_PRE_BUILD_HOOK "npm ci && npm run astro telemetry disable"
clever env set CC_POST_BUILD_HOOK "npm run build"
```

You can also set them through [the Console](https://console.clever-cloud.com) or an import of the `.env` file of this repository:

```bash
clever env import < .env
```

Then, just `git push` the source code:

```bash
git add . && git commit -m "Deploy my static website" && clever deploy
```

You can now access your website through a generic domain (`xxx.cleverapps.io`) or the one of your choice (you'll need to change DNS configuration):

```bash
clever domain
clever domain add your.domain.tld
```

### From GitHub

You can link your GitHub account to your Clever Cloud account for an easier login. It will also enable automatic deployment after a push on a specific branch (it's how this blog is published).
