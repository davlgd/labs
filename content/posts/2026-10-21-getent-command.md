---
author: davlgd
pubDatetime: 2026-10-21T13:37:00Z
title: "getent: ask your system what a name really resolves to"
description: "Ask what your programs ask"
tags:
  - Shell
  - Linux
  - Tools
ogImage: /images/2026-10-getent-name-resolution.webp
---

If you have ever debugged a network problem, you have heard this sentence, or said it: "`curl` reaches it, but `dig` says the host does not exist." Nothing is broken: the two tools are not asking the same question. `getent` asks the one your programs ask.

## Two answers for one name

In a Debian 13 container, as root, add a name to `/etc/hosts`, the way every internal setup ends up doing. Then ask around (`dig` and `host` come from the `bind9-dnsutils` package):

```bash
# a name that only exists in /etc/hosts
$ echo '10.0.0.42 build.internal' >> /etc/hosts

$ dig +short build.internal

$ host build.internal
Host build.internal not found: 3(NXDOMAIN)

$ getent hosts build.internal
10.0.0.42       build.internal
```

`dig +short` prints only the answer, and there is none. `host` says why: `NXDOMAIN`, no such domain. They are DNS clients: they send a query to a DNS server and never open `/etc/hosts`. Your programs do something else: they call the C library, and it decides where to look.

One caveat for desktops. On Ubuntu or Fedora, the DNS server `dig` talks to is a local one, systemd-resolved, and by default it reads `/etc/hosts` too. Ask an outside server, with `dig @9.9.9.9 build.internal`, to see the difference.

## The switch behind it

That decision is the job of the [Name Service Switch](https://man7.org/linux/man-pages/man5/nsswitch.conf.5.html), an idea glibc took from Solaris, and it is configured in one file:

```bash
$ grep ^hosts /etc/nsswitch.conf
hosts:          files dns
```

Files first, then DNS. [`getent`](https://man7.org/linux/man-pages/man1/getent.1.html) (for "get entries") queries those databases through the C library, like `curl`, `ssh` or `ping` do. With `-s`, you can ask one source at a time:

```bash
$ getent -s files hosts build.internal
10.0.0.42       build.internal

$ getent -s dns hosts build.internal; echo $?
2
```

Exit code 2 means "no such key". It makes `getent` usable in a script, with no output to parse:

```bash
$ getent hosts nosuch.invalid || echo "not found: $?"
not found: 2
```

## hosts and ahosts disagree

There is a subtlety in the `hosts` database, and it is easy to trip on:

```bash
$ getent hosts example.com
2606:4700:10::ac42:93f3 example.com
2606:4700:10::6814:179a example.com

$ getent ahosts example.com
104.20.23.154   STREAM example.com
104.20.23.154   DGRAM  
104.20.23.154   RAW    
172.66.147.243  STREAM 
172.66.147.243  DGRAM  
172.66.147.243  RAW    
```

Same name, two families of addresses. `hosts` uses an old call, asks for IPv6 first and only falls back to IPv4 when there is none.

`ahosts` goes through `getaddrinfo` and prints each address once per socket type. Its `AI_ADDRCONFIG` flag drops the families the machine has no address for. This container has no IPv6 address besides loopback, so only IPv4 is left. That is closest to a real connection.

## Not only hosts

The switch covers more than names of machines, and so does `getent`. The last two read files from the `netbase` package, to add in a bare container:

```bash
# user 0, port 443, protocol 17
$ getent passwd 0
root:x:0:0:root:/root:/bin/bash

$ getent services 443
https                 443/tcp

$ getent protocols 17
udp                   17 UDP
```

`passwd` and `group` take a name or a number. That is where it beats `grep root /etc/passwd`: on a machine plugged into LDAP or any other directory, accounts are not in that file, and `getent` still finds them because it asks the switch.

## Alpine and macOS

Alpine has a `getent`, but its C library, musl, has no Name Service Switch. The `/etc/nsswitch.conf` it ships opens with a comment saying musl does not support NSS, and `-s` is not an option there, nor any other:

```bash
$ getent -s files hosts localhost
getent: Unknown database `-s': No error information
Usage: getent database [key ...]
	database may be one of:
		ethers group hosts ahosts ahostsv4 ahostsv6 networks
		passwd protocols services shadow shells
```

macOS has no `getent` at all. The closest thing is `dscacheutil`, where `-q` picks a category and `-a` a key with its value:

```bash
$ dscacheutil -q host -a name example.com
name: example.com
ipv6_address: 2606:4700:10::6814:179a
ipv6_address: 2606:4700:10::ac42:93f3

name: example.com
ip_address: 104.20.23.154
ip_address: 172.66.147.243
```

It exits 0 and prints nothing for an unknown name, so a script cannot rely on its exit code.

The limit is the same everywhere: `getent` tells you what the C library answers. A browser doing DNS over HTTPS or a Go binary with its own resolver never asks it.
