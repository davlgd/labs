---
author: davlgd
pubDatetime: 2025-11-12T13:37:00Z
title: "systemd timers: cron, with a dry run"
description: "Check the schedule before you trust it"
tags:
  - Linux
  - Shell
  - Tools
ogImage: /images/2025-11-systemd-timers-cron.webp
---

`cron` has one property that has cost me more evenings than any other tool: you cannot ask it what it is going to do. You write five fields, you save, and you find out tomorrow. systemd timers replace it, and the reason to switch is not the syntax, it is that you can check your work.

## Two files instead of one line

A timer is a pair. A `.service` that says what to run:

```ini
# /etc/systemd/system/backup.service
[Unit]
Description=Nightly backup

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup.sh
```

And a `.timer` that says when:

```ini
# /etc/systemd/system/backup.timer
[Unit]
Description=Run the nightly backup

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl enable --now backup.timer
```

Two files where cron had one line, which looks like a step backwards until you see what the second file buys.

## The flag cron never had

`Persistent=true` means: if the machine was off when this should have run, run it as soon as it comes back.

`cron` has no equivalent. A laptop asleep at 3am misses its 3am job, silently, and you find out when the backup is a week old. `anacron` exists to patch that hole, which tells you the hole is real.

## Checking the schedule before you trust it

This is the feature that sold me. `systemd-analyze calendar` parses an expression and tells you what it understood:

```bash
$ systemd-analyze calendar 'daily'
  Original form: daily
Normalized form: *-*-* 00:00:00
    Next elapse: [the next midnight]
```

It prints a normalized form and the next time it will fire, so a typo shows up immediately instead of on Sunday. Some more:

```bash
$ systemd-analyze calendar 'weekly'
Normalized form: Mon *-*-* 00:00:00

$ systemd-analyze calendar 'monthly'
Normalized form: *-*-01 00:00:00

$ systemd-analyze calendar 'Mon..Fri 08:30'
Normalized form: Mon..Fri *-*-* 08:30:00

$ systemd-analyze calendar '*:0/15'
Normalized form: *-*-* *:00/15:00
```

That last one is every fifteen minutes, and reading `*:0/15` back as `*-*-* *:00/15:00` is exactly the confirmation you want before enabling it. Compare with `*/15 * * * *`, which you either believe or you do not.

The syntax itself is more readable too: named shortcuts, weekday ranges with `..`, and `DayOfWeek Year-Month-Day Hour:Minute:Second` in an order that matches how a date is written.

## What else you get

Because the job is a unit, everything that applies to a service applies to it.

Its output goes to the journal, so `journalctl -u backup.service` shows every run with timestamps and exit codes. That replaces cron's habit of emailing you output on a machine with no mail configured, or in other words discarding it.

`systemctl list-timers` shows every timer, when it last ran and when it fires next, in one table. There is no `crontab` command that answers that question.

Resource limits work: `MemoryMax`, `CPUQuota`, `Nice` and the rest go straight in the `.service`, so a runaway job is contained by the same mechanism as any other unit.

And `RandomizedDelaySec=30m` spreads a job across a window, so a fleet of machines does not hit the same endpoint at the same second. Doing that in cron means generating a different crontab per host.

## When cron is still the answer

For one line on one machine, `crontab -e` is faster and it is everywhere, including the containers and the BSDs where systemd is not.

The switch pays off when a job matters: when missing a run has consequences, when you need its output afterwards, or when it runs on more than a handful of machines. That is also exactly when "I think that expression is right" stops being good enough, and being able to ask is worth two files.

One caveat if you migrate: a timer's `OnCalendar` follows the system timezone unless you say otherwise, and cron's behaviour there differs by implementation. Set it explicitly, with `OnCalendar=Mon *-*-* 09:00:00 Europe/Paris`, and neither you nor the next person has to guess.
