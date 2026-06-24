---
author: davlgd
pubDatetime: 2026-06-24T13:37:00Z
title: "smolvm: microVMs for code you did not write"
description: "Three hypervisors behind one API"
tags:
  - Linux
  - Tools
ogImage: /images/2026-06-smolvm-microvms.webp
---

An agent that writes code eventually wants to run it, and a container is a thin wall for that. [SmolVM](https://github.com/CelestoAI/SmolVM) puts a hardware boundary there instead: a microVM per workload, started in about a second, thrown away afterwards.

## Three backends, one API

The interesting design choice is that it does not pick a hypervisor for you. It wraps three:

- **Firecracker**, Linux with KVM only, a deliberately narrow set of virtual devices.
- **QEMU**, Linux and macOS, broad hardware emulation, the one you need for a Windows guest.
- **libkrun**, Linux and macOS, using Apple's Hypervisor.framework on the Mac and KVM on Linux, and marked experimental.

Selection is explicit argument, then `SMOLVM_BACKEND`, then a platform default: QEMU on macOS, Firecracker on Linux. `smolvm doctor` tells you where you stand, and it was blunt about my Mac:

```text
╭──── SmolVM Doctor ─────╮
│ Backend: qemu          │
│ Platform: Darwin arm64 │
│ Result: FAIL           │
│ Failures: 2            │
╰────────────────────────╯
```

QEMU is not installed here, so no sandboxes for me today. A diagnostic that names the backend, the platform and the missing dependency before you waste an hour is worth more than most features.

## What it adds on top

This is the part that justifies the project instead of telling you to use Firecracker directly.

Running a microVM by hand means building a rootfs, setting up a TAP device, writing routes and sysctls, wiring vsock, and then driving whichever control interface your hypervisor exposes. Firecracker takes commands over an HTTP API on a Unix socket. QEMU has its monitor. libkrun has neither.

SmolVM ships `smolvm-core`, a Rust helper that does the plumbing: Linux networking with TAP devices, routes and sysctls, sparse disk copy with zstd decompression so an image starts without being fully unpacked, QEMU monitor control for pause, resume and snapshots, and the Firecracker API socket.

For libkrun specifically, that abstraction is doing the most work and delivering the least. libkrun has **no pause, no resume, no snapshots, and experimental vsock**, so anything checkpoint-shaped is unavailable there. The unified API does not invent those capabilities, it reports honestly that this backend lacks them, which is the right call and worth knowing before you pick it for its startup time.

## Driving it

Three ways, and the third is the one that changes how you use it.

The CLI, for a human:

```bash
smolvm sandbox create --name my-sandbox
smolvm sandbox shell my-sandbox
smolvm sandbox snapshot create my-sandbox
smolvm sandbox pause my-sandbox
```

The Python API, for a script:

```python
from smolvm import SmolVM

with SmolVM() as vm:
    result = vm.run("echo 'Hello from the sandbox!'")
    print(result.stdout.strip())
```

And an **HTTP API**, which is how anything that is not Python talks to it:

```bash
$ smolvm server start
```

That is `smolvm server`, "Run the local SmolVM HTTP API". It turns the whole thing into a service on the host: your agent, whatever it is written in, creates and destroys sandboxes over HTTP instead of shelling out. There is a local dashboard too, behind `smolvm ui`.

The sandbox verbs are the same across all three: `create`, `list`, `info`, `shell`, `file` for copying in and out, `port` for forwarding, `env` for variables, `pause`, `resume`, `snapshot`, `delete`.

## Where the agent angle shows

The CLI has verbs I did not expect in an infrastructure tool: `smolvm claude start`, `smolvm codex start`, `smolvm pi start`, `smolvm hermes start`, `smolvm openclaw start`. Each starts a sandbox with that agent's CLI preinstalled. The bare names are command groups and only print help, which caught me out.

That tells you exactly who this is for. It is not a general VM manager that agents happen to use, it is built for the case where something autonomous needs a computer it can break.

Which is also the honest reason to prefer it to a container here. A container shares your kernel, and "the agent wrote something that escaped" is a real category of problem and not a theoretical one.

On cost, be precise, because the marketing and the measurements disagree. The project's own [benchmark report](https://github.com/CelestoAI/SmolVM) puts time-to-first-command at **1177 ms on QEMU and 1408 ms on Firecracker**, mean of five runs. Launching the hypervisor is the cheap part, tens to a couple of hundred milliseconds; the guest boot is what takes the second. Warm commands afterwards are around 1 ms over vsock. So a hypervisor boundary costs you roughly a second per sandbox, not the tens of milliseconds a container would.

Version 0.0.24 is what I looked at, and the leading zeros are doing real work: the CLI surface has moved between releases. Pin it.
