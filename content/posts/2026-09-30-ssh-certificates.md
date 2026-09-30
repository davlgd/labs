---
author: davlgd
pubDatetime: 2026-09-30T13:37:00Z
title: "ssh-keygen -s: the certificate authority in your OpenSSH"
description: "Sign keys, stop copying them"
tags:
  - Shell
  - Linux
  - Tools
ogImage: /images/2026-09-ssh-certificates.webp
---

When you are given access to a server, you know the drill: someone pastes your public key into an `authorized_keys` file. It works, but it ages badly. Keys of people who left are still there, nothing ever expires, and each new machine means another round of copying.

OpenSSH has had an answer since version 5.4, released in March 2010: it can sign keys. A server then trusts one authority, not a list of people. No CA daemon, no X.509, only `ssh-keygen`.

## A CA is a key pair

```bash
# Generate the authority, then my own key signed by it
$ ssh-keygen -q -t ed25519 -f ca -N '' -C 'demo CA'

$ ssh-keygen -q -t ed25519 -f id_ed25519 -N ''
$ ssh-keygen -s ca -I david@laptop -n deploy -V +1h id_ed25519.pub
```

The first two commands are the same: `-t` picks the key type, `-f` the file name, `-N ''` an empty passphrase, fine for a demo. `-C` only adds a comment, `-q` keeps it quiet.

So nothing makes `ca` special. It is an ordinary key pair, `ca` and `ca.pub`, and it becomes an authority when it signs another key. The third command is where the magic happens, with `-s ca` and three flags to set the limits:

- `-I` is a label for logs
- `-n` lists the allowed accounts
- `-V` says how long it lasts

The result is a new file next to the key, `id_ed25519-cert.pub`. `ssh` looks for that name by itself, so there is nothing to configure. You can read what it holds:

```bash
$ ssh-keygen -L -f id_ed25519-cert.pub
id_ed25519-cert.pub:
        Type: ssh-ed25519-cert-v01@openssh.com user certificate
        Public key: ED25519-CERT SHA256:bu87epVAmALhWQBPWbLw7jVNYHqfhfnNlpZx3ilWmP8
        Signing CA: ED25519 SHA256:jnpNKpB/RvIs81fBK2PYvMa+uBTAZjZIjTaT4qzaRaA (using ssh-ed25519)
        Key ID: "david@laptop"
        Serial: 0
        Valid: from 2026-09-30T09:40:00 to 2026-09-30T10:41:10
        Principals: 
                deploy
        Critical Options: (none)
        Extensions: 
                permit-X11-forwarding
                permit-agent-forwarding
                permit-port-forwarding
                permit-pty
                permit-user-rc
```

No chain, no ASN.1: it is [a format of OpenSSH's own](https://man.openbsd.org/ssh-keygen#CERTIFICATES), and it fits on a screen.

## One line on the server

The server, `web-1` here, needs `ca.pub` in `/etc/ssh/` and one [sshd_config](https://man.openbsd.org/sshd_config) directive:

```bash
# on web-1, as root, followed by a restart of sshd
echo 'TrustedUserCAKeys /etc/ssh/ca.pub' >> /etc/ssh/sshd_config.d/ca.conf
```

That is all it will ever know about its users. From a script, `ssh` never prompts:

```bash
$ ssh -i id_ed25519 deploy@web-1 whoami
deploy

$ ssh -i id_ed25519 root@web-1 whoami
root@web-1: Permission denied (publickey,password).
```

The `deploy` account has no `authorized_keys` file at all. The second attempt fails because the certificate names `deploy` and nobody else, and the server log says so:

> Certificate invalid: name is not a listed principal

## The certificate carries its own limits

A certificate can restrict what its holder does, where an `authorized_keys` line had to be edited on each server. Here is one for a CI job, valid ten minutes, from one network, for one command:

```bash
$ ssh-keygen -q -t ed25519 -f ci_key -N ''
$ ssh-keygen -s ca -I ci-job-4212 -n deploy -V +10m -O clear \
    -O force-command='echo deploying' -O source-address=10.0.0.0/8 ci_key.pub
Signed user key ci_key-cert.pub: id "ci-job-4212" serial 0 for deploy valid from 2026-09-30T09:41:00 to 2026-09-30T09:52:21

$ ssh -i ci_key deploy@web-1 whoami
deploy@web-1: Permission denied (publickey,password).
```

The connection came from `127.0.0.1`, and the log is explicit:

> Authentication tried for deploy with valid certificate but not from a permitted source address

Signed again without the address, the same key gets in, but not to do what was asked:

```bash
$ ssh-keygen -s ca -I ci-job-4212 -n deploy -V +10m -O clear \
    -O force-command='echo deploying' ci_key.pub
Signed user key ci_key-cert.pub: id "ci-job-4212" serial 0 for deploy valid from 2026-09-30T09:41:00 to 2026-09-30T09:52:46

$ ssh -i ci_key deploy@web-1 whoami
deploying
```

The request was `whoami` and the server ran its own command. `-O clear` removed the five default permissions listed above, and each other `-O` added a restriction on top.

Expiry needs no cleanup either. Once `-V` has passed, the server answers `Certificate invalid: expired` and nobody had to remember to remove a line anywhere.

## Hosts can be signed too

The other daily irritant is the "authenticity of host can't be established" question everybody answers `yes` to. The same authority can vouch for a server, with `-h`. The private key stays where it is: you fetch the server's public host key, sign it, and send the certificate back.

```bash
# on the CA machine, with a copy of web-1's /etc/ssh/ssh_host_ed25519_key.pub
$ ssh-keygen -s ca -I web-1 -h -n web-1 -V +52w web-1_host.pub
Signed host key web-1_host-cert.pub: id "web-1" serial 0 for web-1 valid from 2026-09-30T09:42:00 to 2027-09-29T09:43:17
```

The file goes to `/etc/ssh/ssh_host_ed25519_key-cert.pub`, with a second directive and a restart:

```bash
# on web-1, as root
echo 'HostCertificate /etc/ssh/ssh_host_ed25519_key-cert.pub' >> /etc/ssh/sshd_config.d/ca.conf
```

Then the client is told which authority to believe. Its `known_hosts` was emptied first:

```bash
$ ssh -i id_ed25519 deploy@web-1 whoami
Host key verification failed.

$ echo "@cert-authority web-1 $(cat ca.pub)" >> ~/.ssh/known_hosts

$ ssh -i id_ed25519 deploy@web-1 whoami
deploy
```

No question asked, even from a machine that has never seen this server. The pattern can be `*.example.com`, so one line covers a whole fleet, including the servers that do not exist yet.

## Never skip -n

One trap is worth knowing, because it depends on the OpenSSH version of your servers. A CA can also be trusted per account, with a `cert-authority` line in `authorized_keys`. On Debian 13 (OpenSSH 10.0), look at what a certificate signed without `-n` does there:

```bash
# on web-1: the deploy account trusts the CA by itself
$ echo "cert-authority $(cat ca.pub)" >> ~deploy/.ssh/authorized_keys

$ ssh-keygen -q -t ed25519 -f anyone -N ''
$ ssh-keygen -s ca -I oops -V +1h anyone.pub
Signed user key anyone-cert.pub: id "oops" serial 0 valid from 2026-09-30T09:43:00 to 2026-09-30T10:44:06

$ ssh -i anyone deploy@web-1 whoami
deploy
```

No principal meant every principal. `TrustedUserCAKeys` always refused such a certificate, the `authorized_keys` path did not. [OpenSSH 10.3](https://www.openssh.org/txt/release-10.3) changed that in April: an empty list now matches nobody, and `ssh-keygen` warns you. On `web-2`, an Alpine 3.24 with 10.3 on both sides:

```bash
$ ssh-keygen -s ca -I oops -V +1h anyone.pub
Warning: certificate will contain no principals (-n)
Signed user key anyone-cert.pub: id "oops" serial 0 valid from 2026-09-30T09:57:00 to 2026-09-30T10:58:21

$ ssh -i anyone deploy@web-2 whoami
deploy@web-2: Permission denied (publickey,password,keyboard-interactive).
```

OpenSSH 10.5 on macOS warns and refuses the same way. But if a server older than 10.3 trusts your CA through `authorized_keys`, a careless signature opens every such account.

## What it does not solve

Revocation is the weak spot. `ssh-keygen -k -f revoked.krl -s ca.pub id_ed25519-cert.pub` builds a revocation list and `RevokedKeys` makes `sshd` read it. Checked: that certificate is locked out.

But that file has to reach every server, the very copying we were trying to stop. Short validity is the better answer: a certificate that dies in an hour rarely needs revoking.

The rest is on you. Somebody has to sign keys every morning, and whoever holds `ca` holds everything, so use one authority for users and another for hosts.
