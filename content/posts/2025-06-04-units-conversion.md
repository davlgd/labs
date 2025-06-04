---
author: davlgd
pubDatetime: 2025-06-04T13:37:00Z
title: "units: how many furlongs per fortnight is that?"
description: "Three thousand units, one command"
tags:
  - Shell
  - Tools
ogImage: /images/2025-06-units-conversion.webp
---

Converting miles to kilometres usually means opening a browser tab. Your machine has had a tool for it since long before browsers, and it knows about three and a half thousand units, including several that exist only as jokes.

```bash
$ units -t "10 miles" "km"
16.09344
```

`-t` is terse mode: one line, just the number, ready to drop into a script. Without it you get an interactive prompt.

## It understands compound units

The interesting part is not converting one unit to another, it's that `units` does dimensional algebra. You give it an expression, it works out whether the two sides are compatible:

```bash
$ units -t "1 acre" "m2"
4046.8564

$ units -t "2 GB / 3 minutes" "Mbit/s"
88.888889
```

That second one is a real question I have needed answered, and the arithmetic is the part I would have got wrong.

And since the post needs to earn its title:

```bash
$ units -t "furlongs/fortnight" "m/s"
0.00016630952
```

A furlong per fortnight is about a sixth of a millimetre per second. The unit database is [8275 lines](https://www.gnu.org/software/units/) defining 3480 units, and it contains things like `smoot`, defined as `5 ft + 7 in` with the comment "Created as part of an MIT fraternity prank":

```bash
$ units -t "1 smoot" "m"
1.7018
```

## The trap that will get you

Write the most natural thing in the world and it fails:

```bash
$ units -t "60 mph" "km/h"
conformability error
        26.8224 m / s
```

`mph` is fine. The problem is `h`, and the reason is beautiful:

```bash
$ grep -E '^h[[:space:]]' /usr/share/units/definitions.units
h         6.62607015e-34 J s # Planck constant (exact)
```

`h` is the Planck constant. You asked for kilometres per Planck constant, and `units` correctly told you that is not a speed. Spell it out and it works:

```bash
$ units -t "60 mph" "km/hour"
96.56064
```

This is what a tool looks like when physics matters more to it than your habits.

## Temperature is a function, not a factor

Converting temperatures is different from converting lengths, because the scales have different zeros. Multiplying by a factor gives the wrong answer, so `units` exposes them as functions:

```bash
$ units -t "tempF(72)" "tempC"
22.222222
```

Note the parentheses. `degF` also exists and means something else: the *size* of a degree, for temperature differences instead of temperatures.

## What you get on each system

Here the two implementations part ways. Linux has GNU Units:

```bash
sudo apt install units
```

macOS ships its own, identifying itself as `Darwin units`, and the temperature functions are missing:

```bash
$ units -t "tempF(72)" "tempC"
unknown unit 'tempF(72)'
```

Everything else in this post gave identical results on both, including the Planck trap and the smoot. So conversions are portable, temperatures are not. On a Mac, `brew install gnu-units` gets you the full version as `gunits`.

The honest caveat is that `units` answers the question you asked, and dimensional analysis is unforgiving about what that question was. A conformability error almost never means the tool is wrong.
