---
author: davlgd
pubDatetime: 2024-03-04T13:37:00Z
title: "Having fun with (Franken)PHP"
description: "No dangerous code has been resurrected for this article"
tags:
  - PHP
  - Caddy
  - FrankenPHP
  - Web
  - Tools
ogImage: /src/assets/images/2024-03-fun-php.webp
---

[PHP](https://www.php.net/) is an old language, born in 1995. It's so old that when, as a teenager, I made my first "dynamic" curriculum vitae with a CRUD interface, it was based on PHP. I was proud of it, I was a web developer (kinda)!

## The former star returns

Like lots of old language it progressively became a (heavy) mess, leaving the hype to newcomers. But unlike many others, it has been able to reform.

Thus, its ecosystem is enjoying a breath of fresh air in recent years, with new tools and cool projects using them. And not just WordPress anymore. The [Laravel](https://laravel.com/) framework, came in 2011 to challenge [Symfony](https://symfony.com/) (2005). The [Composer](https://github.com/composer/composer) package manager, first released in 2012, quickly became the standard.

PHP 7.x, born in 2015, was a big step forward. At the same time, Facebook announced Hack, a PHP dialect, and [the HHVM virtual machine](https://github.com/facebook/hhvm). Then, everybody asked: why is such a big tech still using PHP and try to enhance it?

The fame was definitely back. The PHP 8.0 version, released in 2020, came with JIT and lots of new features. This branch is now getting better at every release, with [a pretty stable schedule](https://www.php.net/supported-versions.php).

## PHP for your CLI tools and scripts

What never ceases to amaze me about PHP, it's how people forget it's a scripting language, and not just a companion of Apache. By the way, `mod_php` is only one of the many Server API (SAPI) out there. You can use PHP with FastCGI, FPM, CLI, etc. It's a powerful tool, not limited to web pages.

For example, you can create a `urlCheck.php` file with this content:

```php
<?php

if ($argc !== 2) {
    echo "Usage: php {$argv[0]} <URL>\n";
    exit(1);
}

$url = $argv[1];

$curlRequest = curl_init($url);
curl_setopt($curlRequest, CURLOPT_NOBODY, true);
curl_setopt($curlRequest, CURLOPT_HEADER, false);
curl_setopt($curlRequest, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($curlRequest, CURLOPT_TIMEOUT, 10);
curl_exec($curlRequest);

$status= curl_getinfo($curlRequest, CURLINFO_HTTP_CODE);

echo "The website at the URL '{$url}' is " . (
    $status == 200 ? "available"
    : "not available\nHTTP response status code: {$status}"
). "\n";

curl_close($curlRequest);
```

And test it with [httpstat.us](https://httpstat.us):

```bash
php urlCheck.php https://httpstat.us/200
> The website at the URL 'https://httpstat.us' is available

php urlCheck.php https://httpstat.us/404
> The website at the URL 'https://httpstat.us/404' is not available
> HTTP response status code: 404

php urlCheck.php https://httpstat.us/307
> The website at the URL 'https://httpstat.us/307' is not available

php urlCheck.php https://httpstat.us/500
> The website at the URL 'https://httpstat.us/500' is not available
> HTTP response status code: 500
```

## PHAR packages and dependencies

Then you can "compile" it in the PHP Archive (PHAR) format with [Box](https://box-project.github.io/box/). You'll only need to create a `box.json` [configuration file](https://github.com/box-project/box/blob/main/doc/configuration.md#configuration) with this content:

```json
{
  "main": "urlCheck.php",
  "output": "bin/urlCheck.phar"
}
```

To build and execute it:

```bash
box compile
bin/urlCheck.phar https://httpstat.us
```

The result is a PHP script with a [shebang](<https://en.wikipedia.org/wiki/Shebang_(Unix)>), that you can execute (if PHP is installed on your system). Note that its size (1107B) is twice the initial script's (599B). To generate a SHA-512 sum and check it:

```bash
box verify bin/urlCheck.phar
box check:signature bin/urlCheck.phar PHAR_FILE_SHA512_SUM
```

To distribute your PHAR packages, you can rely on [PHIVE](https://phar.io/#Install) (PHAR Installation and Verification Environment). If you're looking for PHP tools and dependencies, look at [Packagist](https://packagist.org/), the main Composer package repository.

## PHP native web server

As many languages, PHP has its own web server. It's not as powerful as Apache or Nginx, but it's enough for development and small projects. You can start it with the `php -S` command. You'll need to specify the address and the port, but you can also set the root folder and a router script:

```bash
php -S localhost:8080 -t public/ router.php
```

If you want to go further with the PHP CLI, just look at the `php --help` output. Here are some of my favorite options:

```bash
php --ini                           # Show ini file paths and loaded files
php -d memory_limit=128M            # Set ini entry, e.g. memory limit
php --info                          # Show PHP information
php -s file.php                     # Output syntax highlighted source
php -m                              # Show compiled modules
php -a                              # Run an interactive shell
php -r 'echo "Hello, world!\n";'    # Run PHP code
php -l                              # Lint a file
```

## Portable PHP

If you need to use PHP on a system where it's not installed, [Static PHP CLI](https://github.com/crazywhalecc/static-php-cli) can help you. It allows to build a PHP binary with no dependencies, including all the modules you need, supporting multiple platforms (`Linux`, `macOS`, `FreeBSD`, `Windows`) and Server API (`cli`, `fpm`, `embed` and `micro`).

You can [download it](https://github.com/crazywhalecc/static-php-cli/releases) or get the latest version for your system from the GitHub repository with this script (`composer` and `git` needed):

```bash
git clone https://github.com/crazywhalecc/static-php-cli.git
cd static-php-cli && chmod +x bin/setup-runtime
bin/setup-runtime
bin/composer install -n
chmod +x bin/spc
bin/spc --version
```

Check and fix dependencies:

```bash
bin/spc doctor --auto-fix
```

Build your PHP binary with the SAPI target and extensions you need:

```bash
bin/spc download --for-extensions="bcmath,openssl,tokenizer,ftp,curl"
bin/spc build "bcmath,openssl,tokenizer,ftp,curl" --build-cli --build-micro
bin/spc build "bcmath,openssl,tokenizer,ftp,curl" --build-all --enable-zts
```

You can also compress the binary with `upx` adding `--with-upx-pack` (Linux and Windows only). The final PHP binary will be in the `build/` folder.

## Embed your code with PHP(micro)

If you've read the Static PHP CLI documentation, you've seen the `--build-micro` option. It's a way to "_concatenate the produced binary with any php code then execute it_", based on a fork of the phpmicro project.

For example with our previous `urlCheck.php` script:

```bash
bin/spc micro:combine urlCheck.php -OurlCheck
./urlCheck https://httpstat.us
```

You can also use the built `micro.sfx` file in the `buildroot/bin/` folder:

```bash
cat micro.sfx urlCheck.php > urlCheck && chmod +x urlCheck
./urlCheck https://httpstat.us
```

And now you get an independent binary, built from PHP code. The only problem here from my point of view ? [Its size](https://framagit.org/davlgd/the-sha-calculators-project): ~10MB on my macOS arm64 system.

## Can I deploy Nextcloud with that?

All of this is fun for tiny scripts, but what about complete, real life projects, as [Nextcloud](https://nextcloud.com/)? Let's try with a portable PHP CLI and the web installer. First, build PHP with [needed and some optional](https://docs.nextcloud.com/server/latest/admin_manual/installation/php_configuration.html) extensions:

```bash
bin/spc download --for-extensions="bcmath,ctype,curl,dom,exif,fileinfo,filter,\
    ftp,gd,gmp,iconv,imagick,imap,intl,ldap,mbstring,memcached,openssl,pdo,\
    pdo_mysql,pdo_pgsql,pdo_sqlite,posix,session,simplexml,sodium,xml,\
    xmlreader,xmlwriter,zip"
bin/spc build "bcmath,ctype,curl,dom,exif,fileinfo,filter,ftp,gd,gmp,iconv,\
    imagick,imap,intl,ldap,mbstring,memcached,openssl,pdo,pdo_mysql,pdo_pgsql,\
    pdo_sqlite,posix,session,simplexml,sodium,xml,xmlreader,xmlwriter,zip" \
    --build-cli
```

Download the Nextcloud setup script, start the PHP server:

```bash
mkdir nextcloud
wget -q https://download.nextcloud.com/server/installer/setup-nextcloud.php -O nextcloud/setup-nextcloud.php
buildroot/bin/php -S localhost:8080 -t nextcloud/
```

You can access [http://localhost:8080/setup-nextcloud.php](http://localhost:8080/setup-nextcloud.php) with your browser to install Nextcloud as usual. Build an archive with the `buildroot/bin/` folder and the setup PHP script: you have a ready-to-deploy Nextcloud.

## Adding Caddy: welcome FrankenPHP!

It's great for local tests, but nobody wants to use such an embedded web server in production. So let's try [Caddy](https://caddyserver.com/), a modern, open-source, easy to use, modular web server, built in Go. You can configure it with a simple [`Caddyfile`](https://caddyserver.com/docs/caddyfile), use it as a reverse proxy or as a static file server.

It's PHP-compatible [through FastCGI/PHP-FPM](https://caddyserver.com/docs/caddyfile/directives/php_fastcgi), but such configuration can be difficult to make and is not very portable. It's where [FrankenPHP](https://frankenphp.dev/) can help us.

![FrankenPHP](/src/images/2024-03-franken-php.webp)

Developed by [Kévin Dunglas](https://github.com/dunglas) (from [Les Tilleuls](https://les-tilleuls.coop/)), it is a supercharged version of Caddy including PHP as a SAPI through a [Go package](https://pkg.go.dev/github.com/dunglas/frankenphp). This server is available as a standalone binary or a Docker image.

I saw it gaining traction in the recent months, so I tried it on some projects to look at the good ways to use it, its growing features and benefits. But [can we also use it with Nextcloud?](https://x.com/nomorsad/status/1764343696592339200).

After downloading the binary as `frankenPHP`, make it executable, create a `www/` folder and get the Nextcloud setup script:

```bash
chmod +x frankenPHP
mkdir www
wget -q https://download.nextcloud.com/server/installer/setup-nextcloud.php -O www/setup-nextcloud.php
```

Then start frankenPHP with the `www/` folder as web root:

```bash
./frankenPHP php-server -r www/
```

And... it works! You can access [http://localhost:8080/setup-nextcloud.php](http://localhost:8080/setup-nextcloud.php) with no modules to install, no configuration to make, no PHP-FPM to start. It's possible to go further with a `Caddyfile` or using FrankenPHP's features to create a more complex setup, or [a binary](https://github.com/davlgd/frankenphp-binary-demo). Let's experience it yourself 😉.

## To the Cloud and beyond!

You're interested in FrankenPHP and want to deploy it easily on services like Clever Cloud ? Some days ago, [I was asked](https://x.com/davlgd/status/1763628921965158558) how it could be achieved. Of course, you can easily. I've published example repositories for both [standalone](https://github.com/davlgd/frankenphp-standalone-demo) or containerized versions, with [Laravel](https://github.com/davlgd/frankenphp-laravel-demo) or [Symfony](https://github.com/davlgd/frankenphp-symfony-demo) frameworks.

Next step could be to package FrankenPHP for [Exherbo Linux](https://www.exherbolinux.org/), include it with dedicated options for all our customers. As we're revamping our PHP experience, it's an interesting idea. Let's discuss it.
