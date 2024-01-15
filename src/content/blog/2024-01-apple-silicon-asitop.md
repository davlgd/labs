---
author: davlgd
pubDatetime: 2024-01-17T13:37:00Z
title: "asitop: monitor your Apple Silicon SoC, power consumption included"
description: "How low is it?"
tags:
  - Apple
  - macOS
  - Tools
  - Monitoring
ogImage: /src/assets/images/2024-01-apple-monitoring-computer.webp
---

When you want to monitor a UNIX system, `top` is a good command to know. It provides you informations about CPU, RAM, process, storage and network usage, with some interesting details (in a messy way). [`htop`](https://htop.dev/) is a more modern and flexible alternative, as are [`btop`](https://github.com/aristocratos/btop), [`gtop`](https://github.com/aksakalli/gtop) or [`bottom`](https://github.com/ClementTsang/bottom) (previously `ytop`).

But sometimes, you main concern isn't to use a cross-platform tool. You want "close to metal" data. One of the best-known example of this is [`nvidia-smi`](https://developer.nvidia.com/nvidia-system-management-interface), familiar to Linux gamers and AI developers.

## All you need to know about your Apple SoC

Recently I was looking for something similar for my Apple computers and discovered `asitop`, an open source Python tool, inspired by [`nvtop`](https://github.com/Syllo/nvtop):

![asitop on a Apple M1 Max SoC](@assets/images/2024-01-apple-silicon-asitop.webp)

It displays informations on Apple Silicon SoC in a graphical (CLI) way: how it's composed, Efficient/Performance CPU cores and GPU usage, their frequency. It installs via `pip` or [HomeBrew](https://brew.sh) and need `sudo` rights:

```bash
brew install asitop || pip install asitop
sudo asitop
```

You also get infomations about RAM or Apple Neural Engine (ANE) usage. One of the interesting pieces of information provided is the real-time power usage of the CPU, GPU, ANE and of the whole package. If the chip is throttling (because it's too hot), you get noticed.

Finally, if two things are missing it's the temperature and fan speed. Let's hope it's planned for a future release.
