---
author: davlgd
pubDatetime: 2024-02-17T13:37:00Z
title: How I developed my own static hosting web server, in V
description: "Not the better, but self crafted"
tags:
  - V
  - Blog
  - Web
  - Tools
ogImage: /src/assets/images/2024-02-vlang-weasel.webp
---

Those who follow me on social networks or work with me know how much I love [V](https://vlang.io/). I first heard of this language a few years ago, but really started to learn it last year, during [a small project about binary size](https://x.com/davlgd/status/1685757707213574146).

## Have you ever heard of V?

I won't try to convince you how great it is, I don't need to. Just give it a try, you'll find out by yourself. [The GitHub repository](https://vlang.io/) contains [documentation](https://github.com/vlang/v/blob/master/doc/docs.md), [examples](https://github.com/vlang/v/tree/master/examples), how [to make scripts](https://github.com/vlang/v/blob/master/doc/docs.md#cross-platform-shell-scripts-in-v), ressources about [vlib](https://github.com/vlang/v/tree/master/vlib). You'll find more about vpm packages [here](https://vpm.vlang.io/), the stdlib reference [there](https://modules.vlang.io/).

An [online playground](https://play.vlang.io/) is available. It's easy to install and to run on any platform. Just `git clone` and compile (or download [pre-built binaries](https://github.com/vlang/v/releases)):

```bash
git clone https://github.com/vlang/v
cd v && make
./v symlink
v run examples/hello_world.v
```

And to update:

```bash
v up
```

## vweb evolves, why not host my blog with it?

One of the greatest power of V it's how it's "battery included". It's not only a language, it's a complete ecosystem. So it includes a way to generate and serve web pages as a binary: vweb, [recently overhauled](https://twitter.com/v_language/status/1755135917956706487).

It was thought [to dynamically render a website](https://song.cleverapps.io/), but also to serve static assets: css, images, documents, etc. But when I tried it I asked myself: "_Why not to serve a complete static website?_". So I made somes tests.

And there was a problem: if you didn't asked for a file, nothing was served. For example, if you asked for https://labs.davlgd.fr without ending it with `/index.html` you had a `404` response. It needed a small change, so I did it:

```v
mut asked_path := url.path
base_path := os.base(asked_path)

if !base_path.contains('.') && !asked_path.ends_with('/') {
	asked_path += '/'
}

if asked_path.ends_with('/') {
	if app.static_files[asked_path + 'index.html'] != '' {
		asked_path += 'index.html'
	} else if app.static_files[asked_path + 'index.htm'] != '' {
		asked_path += 'index.htm'
	}
}
static_file := app.static_files[asked_path] or { return false }
```

What did this changed ? In the `serve_if_static` function of `vweb.v`, it creates the `asked_path` mutable variable, based on the `url.path`. If it ends with a `/`, it's a "folder", so I check if it contains an `index.html` or `index.htm` file. If yes, it's served. I also add a `/` at the end of the path when there's not and it doesn't contains a `.`, to handle more cases.

## It's OSS, contribute!

I tried theses changes locally and it worked. I was happy with the result, with how I achieved it, and started to use this modified version of V to build the static web server hosting this blog.

But I didn't want to keep it for me, or wait for such a feature to be included officially in the language. So I added a test and made [a pull request](https://github.com/vlang/v/pull/20784). Here comes another powerfull part in the V ecosystem: it's easy to contribute, reviewers are very reactive and open to newcomers.

Quickly, it was reviewed and merged, I added some documentation and [an example](https://github.com/vlang/v/tree/master/examples/vweb/static_website). Now, anyone can use vweb to serve static websites.

## My way to Tiniest vWeb Server (tws)

My final goal was to provide such a tool as a binary: a complete web server, as small as possible, with no dependencies, to serve static websites from a folder. Here started my work on [Tiniest vWeb Server](https://github.com/davlgd/tws).

Its code is simple, mainly about managing the command line arguments, including and init vweb. It's as easy as:

```v
module main

import x.vweb

pub struct Context {
	vweb.Context
}

pub struct App {
	vweb.StaticHandler
}
```

The main part of the code fits in 4 lines of code, one for a log message:

```v
mut app := &App{}
app.handle_static(folder, true)!
println("Server is started, serving '${folder}' folder")
vweb.run[App, Context](mut app, port)
```

The complete code is available [here](https://github.com/davlgd/tws/blob/main/src/tws.v). It's really basic, but I'll try to make it better over time. The main point for me is that it only uses about 1 MB of storage once compiled, it's multiplaform, and able to serve my static website with no effort and a small footprint from anywhere.

[I distribute tws as binaries](https://github.com/davlgd/tws/releases/) for Linux, macOS (ARM or amd64) and Windows. Give it a try, fork it and make it better. You'll see, it's fun! 😉
