---
author: davlgd
pubDatetime: 2026-08-19T13:37:00Z
title: "MCP in V: shipping against a moving specification"
description: "Aligned to the spec, then the spec moved"
tags:
  - V
  - Tools
  - Web
ogImage: /images/2026-08-v-mcp-module.webp
---

I mentioned at the end of [the `net.s3` post](/posts/2026-07-22-v-net-s3/) that another of my patches in V 0.5.2 deserved its own article. This is it: `mcp`, the [Model Context Protocol](https://modelcontextprotocol.io/) module, which I rewrote to match the 2025-11-25 revision.

Three weeks before this post, the specification moved again. That turns out to be the more interesting story.

## What MCP is, briefly

MCP is how an AI assistant talks to the outside world. A server exposes tools it can call, resources it can read and prompts it can use, and the assistant discovers them at runtime instead of having them hardcoded. JSON-RPC 2.0 underneath, over stdio for local processes or HTTP for remote ones.

The interesting part for a standard library is that it is a *protocol*, not an API. There is a document, it has revisions, and either you match one or you do not.

## What the rewrite did

A first `mcp` module had landed in V earlier in the cycle, covering the server side against an older revision. The specification had moved to 2025-11-25, and the gap was not cosmetic: transports, session handling, several new capabilities and a pile of metadata clients had started to expect.

So the module targets that revision, on both sides:

```v
pub const protocol_version = '2025-11-25'
```

Five thousand lines across the module. Full coverage of JSON-RPC 2.0, stdio and Streamable HTTP transports with SSE and sessions, `Origin` validation for DNS rebinding protection, tools, resources with subscriptions, prompts, completions, logging, progress notifications with cooperative cancellation, and the server-initiated calls `roots/list`, `sampling/createMessage` and `elicitation/create`.

Two things are deliberately deferred and marked as such: the experimental tasks utility, and OAuth authorization, which the spec lists as a `SHOULD`.

## Seeing it work

The module ships a demo server exercising every capability. Being stdio, you can drive it with `printf`, which is my favourite property of a line-oriented protocol. The whole exchange, pasteable:

```bash
{
  printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"demo","version":"1"}}}'
  printf '%s\n' '{"jsonrpc":"2.0","method":"notifications/initialized"}'
  printf '%s\n' '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"echo","arguments":{"text":"bonjour depuis MCP"}}}'
} | ./server
```

The handshake reply, in full:

```json
{"jsonrpc":"2.0","result":{"protocolVersion":"2025-11-25","capabilities":{"tools":{"listChanged":true},"resources":{"listChanged":true,"subscribe":true},"prompts":{"listChanged":true},"logging":{},"completions":{}},"serverInfo":{"name":"v.mcp.showcase","version":"1.0.0","title":"V MCP Showcase","description":"Reference server for vlib/mcp covering every capability of the 2025-11-25 spec.","websiteUrl":"https://vlang.io","icons":[{"src":"https://vlang.io/img/v-logo.png","mimeType":"image/png","sizes":["256x256"]}]},"instructions":"Demo server exercising every MCP capability shipped by vlib/mcp."},"id":1}
```

It advertises what it can do, including that its tool and resource lists can change and that resources support subscription. `serverInfo` carries the display metadata the revision added, down to an icon. Then the call:

```json
{"jsonrpc":"2.0","result":{"content":[{"type":"text","text":"{\"text\":\"bonjour depuis MCP\"}"}],"isError":false},"id":2}
```

Three tools in that demo: an `echo`, a `count_to` that emits progress notifications and honours cancellation, and a `delete_record` that demonstrates destructive-operation annotations without deleting anything.

## Then the specification moved

On July 28th, three weeks before this post, MCP published [the 2026-07-28 revision](https://blog.modelcontextprotocol.io/posts/2026-07-28/). It is not an increment.

It turns MCP from a bidirectional stateful protocol into a stateless request/response one, so a server can sit behind a load balancer with no session affinity. The `initialize` and `initialized` exchange is retired: each request now carries its protocol version, client identity and capabilities in `_meta`, with an optional `server/discover` for capability discovery. Roots, Sampling and Logging are deprecated, with at least twelve months of support. Server-initiated requests give way to Multi Round-Trip Requests, and there is header-based routing through `Mcp-Method` and `Mcp-Name`.

Read that against the section above and the awkwardness is plain. **The handshake I just showed you is the thing the current revision removes.** V's module speaks 2025-11-25, and on the day this post is dated that is one revision behind.

## What that is actually like

I do not think this is a failure, and I am not going to pretend the module is current when it is not.

A specification with dated revisions is a moving target by construction, and anything implementing it is a photograph. The module matched the spec when it was merged, it matches a named revision today, and it declares which one in a public constant rather than leaving you to find out from a runtime error. That last part is the property that matters: `protocol_version` is not decoration, it is the contract you can check before you deploy.

The alternative model, where a client and a server negotiate a version at connection time, is exactly what 2026-07-28 removes, and there is a lesson in that too. Stateless request/response is easier to operate and harder to version, so the revision moves version identity into every request.

For anyone using it now: the module is correct against 2025-11-25, which is what a large share of deployed clients still speak. Anything targeting 2026-07-28 needs work that has not been done yet, and the twelve-month deprecation window on the retired features is the budget for doing it.

The module is [PR #27133](https://github.com/vlang/v/pull/27133), the revision it implements is [published in full](https://modelcontextprotocol.io/specification/2025-11-25), and the one that supersedes it is linked above. If you want to help close that gap, the issue is open 😉
