---
author: davlgd
pubDatetime: 2026-10-14T13:37:00Z
title: "curl: signing requests with HTTP Message Signatures"
description: "Sign here, verify anywhere"
tags:
  - V
  - Web
  - Tools
ogImage: /images/2026-10-curl-httpsig.webp
---

Two weeks ago, my implementation of HTTP Message Signatures [landed in V](https://github.com/vlang/v/pull/27113) as `net.http.signature`. curl got there first: 8.22.0, released on September 2nd, can sign requests with four experimental options. And [curl 8.23.0](https://daniel.haxx.se/blog/2026/10/14/curl-8-23-0/) is out today, so I built it and made the two talk.

## What gets signed

A bearer token works for whoever holds it, on any request. TLS protects it on the wire, not in the proxy that terminates TLS, nor in a log. Once it leaks, it is good for anything.

[RFC 9421](https://www.rfc-editor.org/rfc/rfc9421.html) takes another road: the private key never leaves the client, and what travels is a signature bound to one request.

The client picks parts of the request (the method, the host, the path, some headers), signs them, and sends the result in two headers. The server rebuilds the same text from what it received and checks the signature. Change one signed part on the way and it no longer matches.

## You have to build it

The feature is new and experimental: your distribution's curl lacks it. Debian 13 has 8.14.1:

```bash
$ curl --version | head -1 | cut -d' ' -f1-2
curl 8.14.1

$ curl -s --httpsig-key @k.hex --httpsig-keyid my-key http://api.internal:8080/hello
curl: option --httpsig-key: is unknown
curl: try 'curl --help' or 'curl --manual' for more information
```

It takes one more flag at configure time:

```bash
# build curl 8.23.0 with HTTP Message Signatures, in /opt/curl
apt-get install -y build-essential libssl-dev libpsl-dev zlib1g-dev

curl -sLO https://curl.se/download/curl-8.23.0.tar.xz
tar xf curl-8.23.0.tar.xz && cd curl-8.23.0

./configure --with-openssl --enable-httpsig --prefix=/opt/curl
make -j4 && make install

export PATH=/opt/curl/bin:$PATH
```

`--enable-httpsig` is the flag that matters, and `--prefix` keeps this build apart from the system's curl. `configure` warns you that the feature is "marked EXPERIMENTAL", and `HTTPSIG` shows up in the features line of `curl --version`.

## A key, then a request

curl wants an Ed25519 private key as 64 hexadecimal characters, the raw 32-byte seed. No PEM. The documentation gives the recipe to get there with OpenSSL 3, the one Debian 13 ships:

```bash
# an Ed25519 key pair, then its seed in hex for curl
openssl genpkey -algorithm ED25519 -out k.pem
openssl pkey -in k.pem -text -noout | grep -A3 ^priv: | tr -cd '[:xdigit:]' > k.hex
openssl pkey -in k.pem -pubout -out pub.pem
```

The second line keeps the private part of OpenSSL's dump and strips all but hex digits.

Then two options are enough: `--httpsig-key` takes the seed, `@` meaning "read it from this file", and `--httpsig-keyid` a name the server will use to find the public key.

`api.internal` is a line in `/etc/hosts`, pointing to a Python server echoing the request:

```bash
$ curl -s --httpsig-key @k.hex --httpsig-keyid my-key http://api.internal:8080/hello
GET /hello
Host: api.internal:8080
Signature-Input: sig1=("@method" "@authority" "@path");created=1791972751;keyid="my-key";alg="ed25519"
Signature: sig1=:pqmlRLEPpLNfSk6uxCcE+SxxwC4mIy1iU5zd4IUKzP9QfNgAMBzULGnqlN/EZCkALtBmuUIzdWos9pD6ODg+Cg==:
User-Agent: curl/8.23.0
Accept: */*
```

`Signature-Input` is the recipe: what was signed, when, with which key. `Signature` is the result. By default curl covers the method, the authority and the path, plus the query string if any.

## Checking it without curl

A signature is only worth something if somebody else can verify it. With the response above saved as `r1.txt`, the text curl signed is short enough to rebuild by hand:

```bash
# from the two headers: the signature in binary, and the text it covers
sed -n 's/^Signature: sig1=:\(.*\):$/\1/p' r1.txt | base64 -d > sig.bin
params=$(sed -n 's/^Signature-Input: sig1=//p' r1.txt)
printf '"@method": GET\n"@authority": api.internal:8080\n"@path": /hello\n"@signature-params": %s' "$params" > base.txt
```

```bash
$ cat base.txt
"@method": GET
"@authority": api.internal:8080
"@path": /hello
"@signature-params": ("@method" "@authority" "@path");created=1791972751;keyid="my-key";alg="ed25519"

$ openssl pkeyutl -verify -pubin -inkey pub.pem -rawin -in base.txt -sigfile sig.bin
Signature Verified Successfully
```

One line per covered component, then the parameters, and no final newline. `-rawin` tells OpenSSL to verify the text itself: Ed25519 signs messages, not digests.

Now the V module (in master for now, so `v up` first), fed both headers as received:

```v
import net.http.signature

// the two header values, as the server received them
sig_input := 'sig1=("@method" "@authority" "@path");created=1791972751;keyid="my-key";alg="ed25519"'
sig := 'sig1=:pqmlRLEPpLNfSk6uxCcE+SxxwC4mIy1iU5zd4IUKzP9QfNgAMBzULGnqlN/EZCkALtBmuUIzdWos9pD6ODg+Cg==:'

key := signature.Key.from_pem('-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAP1NhJE04VKWw+s5AWYwMacWv2NJ59Eoc3+z1aAqRDJ4=
-----END PUBLIC KEY-----')!

covered := ['@method', '@authority', '@path']

request := signature.Components{
	method:    'GET'
	authority: 'api.internal:8080'
	path:      '/hello'
}
signature.verify(request, sig_input, sig, 'sig1', key, required_components: covered)!
println('/hello: verified')

// same signature, replayed on another path
tampered := signature.Components{
	...request
	path: '/admin'
}
signature.verify(tampered, sig_input, sig, 'sig1', key, required_components: covered) or {
	println('/admin: ${err.msg()}')
}
```

```bash
$ v run verify.v
/hello: verified
/admin: http.signature: signature sig1 did not verify
```

Two independent implementations agree on the bytes, and a signature lifted from `/hello` is worthless on `/admin`, as it should be.

That check does not have to live in your code. In May, I contributed [two plugins](https://github.com/MAIF/otoroshi/pull/2567) to the Otoroshi API Gateway: one verifies RFC 9421 signatures before a request reaches the backend, the other signs responses on their way out.

## The body is your job

Look at the default again: method, authority, path. Nothing about the content.

The V module's `verify_request` is stricter out of the box. It wants the method, the full target URI, the authority and a `content-digest` covered. curl's default fails that twice, and it has no way to sign a target URI, hence the explicit list of components in the program above.

The digest part can be fixed from curl's side. It signs headers with `--httpsig-headers`, but only those you pass with `-H`, and it will not compute a digest for you:

```bash
# sign the body too: compute its digest, send it, cover it
body='{"hello":"world"}'
digest=$(printf '%s' "$body" | openssl dgst -sha256 -binary | base64)

curl -s --httpsig-key @k.hex --httpsig-keyid my-key \
  -H "Content-Type: application/json" \
  -H "Content-Digest: sha-256=:$digest:" -d "$body" \
  --httpsig-headers 'method authority path content-type: content-digest:' \
  http://api.internal:8080/items
```

A trailing colon marks a header, other words are parts of the request. The server receives:

```http
Signature-Input: sig1=("@method" "@authority" "@path" "content-type" "content-digest");...
```

Forget the `-H` and curl stops before sending anything. Without `-s`, it says why: `httpsig: header 'content-digest' not found in request`. And a signed digest proves nothing by itself, the server still has to hash the body it received and compare.

## Experimental means experimental

This is not ready for production, and [curl's own documentation](https://github.com/curl/curl/blob/curl-8_23_0/docs/EXPERIMENTAL.md) says so: the options may change, and vulnerabilities in experimental code are not handled as security issues.

The scope is narrow too. `--httpsig-algo`, the fourth option, takes two values: `ed25519`, the default, and `hmac-sha256`. Ask for `ecdsa-p256-sha256` and you get `unsupported algorithm`. Requests only: curl does not verify a signed response.

There is no `expires` and no `nonce` either. A captured request can be replayed as it is until the server decides its `created` is too old, and that check is yours to write.

As for 8.23.0, its only `httpsig` line in [the changelog](https://curl.se/ch/8.23.0.html) fixes the key generation commands in the documentation. The release is worth installing for another reason: 24 security fixes.

Among other things, leaving the experimental list requires interoperability checked against at least two independent implementations. Consider this post a data point.
