---
author: davlgd
pubDatetime: 2026-09-26T13:37:00Z
title: "Freebox API: from HTML docs to OpenAPI and llms.txt"
description: "Parse it once, for everyone"
tags:
  - Web
  - AI
  - Tools
ogImage: /images/2026-09-freebox-openapi.webp
---

Most ISP routers are black boxes: a web interface, a few settings, and that's it. The Freebox, from French ISP Free, has long been an exception. Freebox OS exposes an HTTP API on the local network, and Free documents it for developers.

An app asks for access, you accept it on the box's own display, and from there it can read the state of the connection, list the devices on your network, drive downloads, Wi-Fi, port forwarding, even virtual machines.

When I started writing apps for mine, I first looked for an OpenAPI description, something a tool could read. Free doesn't publish one. So I built [freebox-openapi](https://github.com/davlgd/freebox-openapi).

## Great docs, for humans

Free's documentation is thorough, but it lives in two places. And they don't describe the same API. The [public SDK](https://dev.freebox.fr/sdk/os/) on dev.freebox.fr still announces "Current API version is 4.0". My box runs 16.1. The documentation of the current API ships with each Freebox :

- [http://mafreebox.freebox.fr/doc/index.html](http://mafreebox.freebox.fr/doc/index.html)

It's a single, long HTML page: prose, property tables, request and response examples. A patient human finds its way through this, a tool doesn't: nothing to generate a client from, nothing to validate a response against. Finding out what `GET /lan/browser/pub/` returns means scrolling.

Coding agents have the same problem. To open my first session, I pasted the section on app tokens into the prompt. Fine for one endpoint. Not for 354.

## From HTML to OpenAPI

`freebox-openapi` does that reading for you. It fetches the documentation from your Freebox, pulls objects, properties, operations, examples and error codes out of the HTML, and turns them into an OpenAPI 3.1 description: 354 operations, 197 schemas, plus the notification webhooks.

The result is checked against the official OpenAPI 3.1 schema and Redocly's linter, and the TypeScript types generated from it with `openapi-typescript` have to compile. Every example of the documentation is also compared with its schema, and the ones that disagree are reported.

It's written in TypeScript and runs on [Bun](https://bun.sh). With Bun installed and a Freebox on your local network, you can rebuild everything from the documentation your own box serves:

```bash
git clone https://github.com/davlgd/freebox-openapi.git
cd freebox-openapi
bun install
bun run fetch   # download the documentation served by the Freebox
bun run all     # parse, build openapi.json, validate it
```

## The box knows better

A spec built from documentation inherits its mistakes. So I checked it against my own Freebox: `bun run conformance` sends read-only requests and validates each response against the spec. When the two disagree, the box wins, and the spec keeps a trace.

Each correction carries an `x-freebox-live-correction` field, with its reason and the call that proved it. Listing them takes a few lines of `jq`:

```bash
$ curl -s https://raw.githubusercontent.com/davlgd/freebox-openapi/main/openapi.json \
    | jq -r '.. | objects | .["x-freebox-live-correction"].why? // empty' \
    | sort | uniq -c | sort -rn | head -6
   3 Empty list returned as {}
   2 Documented as int, returned as a string
   2 Declared str, returned as boolean
   1 The value table is copied from LanHostName.source; the box returns mac_address
   1 Query string, not body; fields is ignored
   1 Documented as string, returned as integer like wan_port_end
```

Most are small: a Wi-Fi network identified by a MAC address, a camera ID documented as an integer while it starts with a zero. Some would break a client: `GET /rrd/`, the stats history, reads its parameters from the query string and silently ignores a JSON body. The documentation even has typos in its paths, such as `/network_controlr/`.

A GET request isn't always harmless, though. Downloading an OpenVPN configuration through the API invalidates the previous one, so those calls stay out of the checks.

Then my Freebox updated itself halfway through, from Freebox OS 4.11.1 to 4.13.1. The documentation it served hadn't changed by a single byte, and every check passed again. One detail stood out: the old firmware announced API 15.0, yet already answered on `/api/v16/`. Since then, each conformance report records the firmware it ran against.

## llms.txt for coding agents

OpenAPI isn't enough. A spec describes endpoints and types, while an agent writing code also needs the explanations around them: how to open a session, how WebSocket events flow, why mDNS is the preferred way to find the box. That prose reads better as documentation, one section at a time. So freebox-openapi also produces text files following the [llms.txt](https://llmstxt.org) convention.

`llms.txt` is the entry point: base URL, authentication, the JSON envelope, and one link per section. `llms-full.txt` carries everything in one file, and every section also exists on its own (Wi-Fi, downloads, file system, VMs...), so an agent loads only what it needs.

The Markdown keeps the order and the prose of Free's documentation, but operations, property tables and examples come from the corrected spec: fixed types, valid JSON, and corrections written inline. Here is `GET /rrd/`, in `llms/rrd.md`:

```markdown
#### `GET /rrd/`

*unstable*

Same as post request, but allowed without ‘settings’ permission

Correction: Query string, not body; fields is ignored.

| Parameter | In | Type | Description |
| --- | --- | --- | --- |
| `db` | query | string | Name of the rrd database to read. [...] |
```

## What it can't tell you (yet)

Out of 387 examples in the documentation, 30 don't match the generated schemas, mostly because the documentation contradicts itself. About 80 operations only describe the response envelope: most return nothing, a few return something the documentation never specifies.

The live checks are read-only, run on one Freebox model, within the permissions granted to the app: writes are described, not tested. Permissions per operation are mostly inferred, since the documentation rarely states them, and the spec flags each guess (`x-freebox-permission`).

This is an unofficial project, and the documentation belongs to Free. I'd be glad to see Free publish such a reference one day, next to its documentation. Until then, [freebox.davlgd.com](https://freebox.davlgd.com) hosts the spec and [the llms.txt](https://freebox.davlgd.com/llms.txt) files. And if your box disagrees with them, [issues](https://github.com/davlgd/freebox-openapi/issues) are open 😉
