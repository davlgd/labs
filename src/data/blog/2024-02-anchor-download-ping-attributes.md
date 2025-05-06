---
author: davlgd
pubDatetime: 2024-02-26T13:37:00Z
title: "Anchor (<a>) element: do you now its download and ping attributes?"
description: "I love to still have such n00b moments"
tags:
  - HTML
  - Web
  - Tools
  - Tutorials
ogImage: /src/assets/images/2024-02-anchor-a-html.webp
---

One thing I like about technology, is how I can discover new things every day, even about the most basic tools. For example, last week I read a tweet about the `<a>` element and its `download` attribute. Although I create web pages since 90s, I didn't know about it. So, I made some tests.

## Download a file or open it: let's decide

When you create a link to a file, maybe you want the user to open it directly in the browser or to get a download link. By default, the browser will take its own decision, based on MIME type, file extension, etc. But you can send an extra signal, by using the `download` attribute. For example:

```html
<a href="/davlgd-lab.webp">Open the image</a>
<a href="/davlgd-lab.webp" download>Download the image</a>
<a href="/davlgd-lab.webp" download="image.webp">Download as image.webp</a>
```

It gives the following result:

- <a href="/davlgd-lab.webp">Open the image</a>
- <a href="/davlgd-lab.webp" download>Download the image</a>
- <a href="/davlgd-lab.webp" download="image.webp">Download as image.webp</a>

Of course, there are some limitations. For example the file must have the same origin as the page, and support for this attribute can vary from one browser to another. But it's a good way to give a hint about what you want.

## Ping a server when the user clicks on a link

After discovering this, my first instinct was to check the [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a). If there was an interesting attribute I didn't know about, there might be others. And I was right: I also discovered `ping`.

As the name suggests, when the user clicks on a link, the `ping` attribute sends a request to another URL in the background. It can be a way to track usage without adding parameters to the URL or using JavaScript:

```html
<a href="https://labs.davlgd.fr" ping="https://ping.davlgd.fr">Read my blog</a>
```

The `ping` request contains details about context, browser and the system:

```http
POST /?action=open&file=external_webp HTTP/1.1
Accept: */*
Accept-Encoding: gzip, deflate, br
Accept-Language: fr-FR,fr
Cache-Control: max-age=0
Connection: keep-alive
Content-Length: 5
Content-Type: text/ping
Cookie: token=<TOKEN>; PHPSESSID=<ID>
Host: localhost:4242
Origin: http://localhost:8080
Ping-From: http://localhost:8080/
Ping-To: https://labs.davlgd.fr/davlgd-lab.webp
Sec-Fetch-Dest: empty
Sec-Fetch-Mode: no-cors
Sec-Fetch-Site: same-site
Sec-GPC: 1
User-Agent: <USER_AGENT>
sec-ch-ua: <SECONDARY_USER_AGENT>
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "macOS"
```

Thus, it's often seen as a privacy issue and not widely used. But it's good to know it exists and to look for ways to avoid it.

If you want to learn more or experiment with the`ping` attribute, I've published a [GitHub repository](https://github.com/davlgd/anchor-download-ping-demo) containing a demo website, a web server to host it and another to log the `ping` requests in a file. Have fun with it! 😉
