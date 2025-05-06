---
author: davlgd
pubDatetime: 2024-02-07T13:37:00Z
title: "How I use Linux distributions on my Mac, with a single command"
description: "Thanks to aliases and Docker"
tags:
  - Alias
  - Shell
  - Docker
  - Tools
  - Apple
  - macOS
  - Tutorials
ogImage: /src/assets/images/2024-02-macos-linux-distribution-docker.webp
---

As mentioned [in a previous article](/posts/2024-02-add-up-aliases/), I use aliases to ease my (CLI) life. In addition to day-to-day actions, they allow me to automate “boring” stuff, which requires me to remember multiple commands, launch them the same way over and over again. A good example of this is Docker.

For me, Docker is a great tool for local development. If I need to test something in a specific distribution or context, it’s easy to download an image and use it. To cover my needs on GNU/Linux, I prefer [Podman](https://podman.io/docs/installation#installing-on-linux). I can use it [with the same command](https://archlinux.org/packages/extra/x86_64/podman-docker/) but no `sudo`. Under macOS, I use [Docker Desktop](https://docs.docker.com/desktop/install/mac-install/).

Most of the time, once installed, I just want to access an image quickly, do my stuff and exit. For that, I need to pull it, create and start a container and run. But I found an easier way to do all that adding a function in my `~/.zshrc` file and use it as an alias (it works with `bash` or `fish` too):

```bash
dssh() {
  local container_name=$1
  local image_name=$2
  local prefix="dock"
  local docker_command="docker"
  local launch_command=$([[ "${image_name}" == *alpine* ]] && \
    echo "/bin/sh" || echo "/bin/bash")

  if ! command -v ${docker_command} &> /dev/null; then
    echo "Error: Docker is not installed"
    return
  fi

  container_exists=$(docker ps -a --format '{{.Names}}' | \
    grep -q "^${container_name}$" && echo "yes" || echo "no")

  if [ "$#" -eq 1 ]; then
    if [ "${container_exists}" = "no" ]; then
      echo "Container ${container_name} does not exist"
      return
    fi
  elif [ "$#" -eq 2 ]; then
    if [ "${container_exists}" = "no" ]; then
      echo "Creating container ${container_name} with image ${image_name}..."
      ${docker_command} run -dit --hostname "${prefix}_${container_name}" \
      --name "${container_name}" "${image_name}" ${launch_command}
    fi
  else
    echo "Usage: $0 <CONTAINER_NAME> [IMAGE]"
    return
  fi

  if [ "$(docker inspect -f '{{.State.Running}}' "${container_name}")" = "false" ]; then
    echo "Starting container ${container_name}..."
    ${docker_command} start "${container_name}"
  fi

  echo "Executing '${launch_command}' in container ${container_name}..."
  ${docker_command} exec -it "${container_name}" ${launch_command}
}
```

What it does is check whether `docker` (or another command you can define) is available. If so, you can use it to access an existing container by name or create one from an image and access it.

I always use `/bin/bash` as the start command unless I'm requesting an Alpine image where `/bin/sh` is the default Shell. This could be done better, with an optional variable for example, but it fits my needs as is for now.

I usually don’t use this function directly as an alias, rather from other aliases. For example on a Mac, based on an Apple Silicon `aarch64` SoC:

```bash
alias exherbo="dssh exherbo exherbo/exherbo-aarch64-unknown-linux-gnueabi-gcc-base"
alias ubuntu="dssh ubuntu ubuntu:latest"
```

Thus, I can access an already configured Ubuntu whenever I want simply with the `ubuntu` command, or do the same with `exherbo`.

And if I want to access another distribution:

```bash
dssh alpine alpine:latest # To get latest Alpine
dssh debian debian:latest # To get latest Debian stable
dssh debslim debian:unstable-slim # To get next Debian in slim version
```
