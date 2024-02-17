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

## Host as a static website on Clever Cloud with Tiniest vWeb Server (tws)

You'll need a Clever Cloud account to access [the Console](https://console.clever-cloud.com) or to use the CLI, [Clever Tools](https://github.com/CleverCloud/clever-tools):

```bash
npm i -g clever-tools
clever login
```

First, create a Node.js application, the CLI command is:

```bash
clever create -t node
```

As a PaaS platform, a deployment on Clever Cloud starts with a build phase, where the static website will be generated. I host it through [Tiniest vWeb Server](https://github.com/davlgd/tws), downloaded and setup via the `get_deps.sh` script. You can use any of your choice. HTTPS acces is automatically configured (thanks to the [Sōzu load balancer](https://github.com/sozu-proxy/sozu)).

No external runner such as GitHub Action is needed. Configuring the build phase is as easy as:

```bash
clever scale --flavor pico    # A tiny instance is enough for static blog
clever scale --build-flavor M # A bigger instance to quickly build the website

clever env set CC_WEBROOT "/dist"
clever env set CC_OVERRIDE_BUILDCACHE "/tws-linux-x86_64:/dist:/package.json"
clever env set CC_PRE_BUILD_HOOK "./get_deps.sh"
clever env set CC_POST_BUILD_HOOK "npm run build"
clever env set CC_RUN_COMMAND "./tws-linux-x86_64 dist"
```

You can also set this through [the Console](https://console.clever-cloud.com) or import environment variables of the `.env` file of this repository:

```bash
clever env import < .env
```

To change the Node.js version (latest `21.x` in this example), edit this in the `package.json` file:

```json
"engines": {
  "node": "21"
}
```

Then, just `git push` the source code:

```bash
git add . && git commit -m "Deploy my static website" && clever deploy
clever open
```

You now access your website through a generic domain (`xxx.cleverapps.io`). You can add the one of your choice (you'll need to change DNS configuration) and set it as the default:

```bash
clever domain
clever domain add your.domain.tld
clever domain favourite set your.domain.tld
```

If you need to regularly rebuild the blog (for scheduled posts for example), follow [this tutorial](http://labs.davlgd.fr/posts/2024-01-schedule-posts-astropaper/).

### From GitHub

You can link your GitHub account to your Clever Cloud account for an easier login. It will also enable automatic deployment after a push on a specific branch (it's how this blog is published).
