---
author: davlgd
pubDatetime: 2026-10-28T13:37:00Z
title: "RDAP: whois, with JSON and a bootstrap file"
description: "Port 43 is not dead yet"
tags:
  - Web
  - Tools
ogImage: /images/2026-10-rdap-whois.webp
---

`whois` is one of those commands you type without thinking, then squint at the output. Free text, a different layout for each registry, and scripts that break at the first `grep`. The protocol dates back to 1982, and it shows.

Its successor is called RDAP, for Registration Data Access Protocol. Since January 28, 2025, it is [the reference for generic domains](https://www.icann.org/en/announcements/details/icann-update-launching-rdap-sunsetting-whois-27-01-2025-en), and the contractual obligation to run a WHOIS service ended that day for their registries and registrars. I ran into it while writing a small tool.

## HTTP in, JSON out

There is no client to install. RDAP is a URL you fetch and JSON you filter:

```bash
# on Debian 13
$ whois example.com | head -5
   Domain Name: EXAMPLE.COM
   Registry Domain ID: 2336799_DOMAIN_COM-VRSN
   Registrar WHOIS Server: whois.iana.org
   Registrar URL: http://res-dom.iana.org
   Updated Date: 2026-08-14T08:01:43Z

$ curl -s https://rdap.verisign.com/com/v1/domain/example.com | \
    jq -r '.events[:3][] | "\(.eventAction)\t\(.eventDate)"'
registration	1995-08-14T04:00:00Z
expiration	2027-08-13T04:00:00Z
last changed	2026-08-14T08:01:43Z
```

The `jq` filter keeps the first three events and prints the action and date of each. Same record, but the second one has field names and a structure that will not move because a registry changed its mind about indentation.

The answer to "does this domain exist" is no longer a text to interpret. It is a status code:

```bash
$ curl -s -o /dev/null -w '%{http_code}\n' https://rdap.verisign.com/com/v1/domain/example.com
200

$ curl -s -o /dev/null -w '%{http_code}\n' https://rdap.verisign.com/com/v1/domain/nobody-registered-this-42.com
404
```

`-o /dev/null` drops the body and `-w` prints the status code. Read it for what it is: a 404 means this server has nothing for that name. Ask the wrong server and you get the same code.

## Who to ask?

That URL did not come from nowhere. With `whois`, finding the right server meant a hardcoded list in the client, or following referrals from one server to the next. RDAP has a directory instead: IANA publishes a [bootstrap file](https://data.iana.org/rdap/dns.json) listing extensions and their RDAP service.

```bash
$ curl -s https://data.iana.org/rdap/dns.json -o dns.json

$ jq -r '.services[] | select(.[0] | index("fr")) | .[1][0]' dns.json
https://rdap.nic.fr/

$ curl -s https://rdap.nic.fr/domain/afnic.fr | \
    jq -r '.events[:2][] | "\(.eventAction)\t\(.eventDate)"'
registration	2001-12-10T23:00:00Z
expiration	2029-07-18T08:26:59Z
```

Each entry of the file pairs a list of extensions with a list of URLs. The filter picks the entry containing `fr` and prints its first URL.

One small JSON file, cacheable, and the client knows where to go for more than a thousand extensions. To skip that step, [rdap.org](https://about.rdap.org/), a volunteer-run redirector, reads it for you:

```bash
$ curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://rdap.org/domain/example.org
302 https://rdap.publicinterestregistry.org/rdap/domain/example.org
```

IP addresses and AS numbers have their own bootstrap files too, and the same redirector:

```bash
$ curl -sL https://rdap.org/ip/1.1.1.1 | jq -r '.name, .country'
APNIC-LABS
AU

$ curl -sL https://rdap.org/autnum/13335 | jq -r .name
CLOUDFLARENET
```

## Not everybody is there

"More than a thousand" is not "all of them". IANA also publishes the list of every extension in the root zone, and [`comm`](/posts/2026-04-22-comm-join/) is made for this kind of question:

```bash
# every extension on one side, those with an RDAP service on the other
$ curl -s https://data.iana.org/TLD/tlds-alpha-by-domain.txt | \
    grep -v '^#' | tr A-Z a-z | sort > all.txt
$ jq -r '.services[][0][]' dns.json | sort > rdap.txt

$ wc -l < all.txt; wc -l < rdap.txt
1436
1203

$ comm -23 all.txt rdap.txt | wc -l
233

$ comm -23 all.txt rdap.txt | grep -cE '^..$'
175
```

`comm -23` keeps the lines found only in the first file, `grep` counts the two-letter ones.

At the time of writing, 233 extensions out of 1436 were missing from the bootstrap file: 175 two-letter country codes, 55 of their internationalized variants, plus `arpa`, `edu` and `mil`. Not one generic extension under ICANN contract, and not obscure countries either:

```bash
$ comm -23 all.txt rdap.txt | \
    grep -E '^(de|eu|io|ch|be|it|es|jp|us|co|me|cn|ru)$' | paste -sd' ' -
be ch cn co de es eu io it jp me ru us
```

ICANN's rule binds generic extensions, the ones it has a contract with. Country codes set their own policy. Some kept only port 43, others run an RDAP server and never declared it at IANA: `rdap.denic.de` answers for `.de`, and rdap.org still returns a 404 for a `.de` domain.

Either way, a client that trusts the bootstrap file will not find them, and the old path still applies, starting at IANA:

```bash
$ whois -h whois.iana.org de | grep '^whois'
whois:        whois.denic.de
```

That is the logic of [vWhois](https://github.com/davlgd/vWhois), the small client I am writing in V: RDAP first, through the bootstrap file, and WHOIS when the extension is not in it. More on that soon.

## What you will not find

Do not expect RDAP to bring back what `whois` lost. Personal data of individual holders has been redacted for years, and a newer protocol does not change the privacy rules. Companies are another story: the `afnic.fr` answer above still carries its holder. And for a `.com`, the registry only knows the registrar.

It is verbose (2440 bytes for `example.com`), contact data comes as jCard arrays, painful to read with `jq`, and servers rate limit: rdap.org answers 429 after 10 requests in 10 seconds.

And port 43 is not dead. The `whois` at the top of this post got its answer, for a `.com`, nearly two years after the obligation ended.
