# HEARTH

*a cottage, a cat, a season.*

Your great-aunt Wren has gone travelling at seventy-eight, and she's left you her
cottage on Lake Ilse for the autumn. Along with the house comes Biscuit (an
orange cat who says she hasn't been fed) and **HEARTH**, a beige 1987 home
computer that Wren wired into every room.

The cottage *is* the filesystem. Rooms are folders. Notes are files. The cat is
PID 1.

You have two weeks until **Lantern Night**, when the lantern on Wren's dock is
always the first light on the lake. It's been lit every year since 1974.
Everything you need is somewhere in the house. Wren isn't great at remembering
where she put things.

```
 _  _ ___   _   ___ _____ _  _
| || | __| /_\ | _ \_   _| || |
| __ | _| / _ \|   / | | | __ |
|_||_|___/_/ \_\_|_\ |_| |_||_|
```

## How to play it

**On iPad (Swift Playgrounds):**
1. Get the `Hearth.swiftpm` folder onto your iPad (download the repo as a zip
   from GitHub, unzip it in the Files app).
2. Tap the **whole `Hearth.swiftpm` folder** to open it in Swift Playgrounds.
3. Press **Run** (▶). It saves as you go, so you can close it whenever.

**In a browser (any computer):** open `docs/index.html`. That one file is the
whole game, so you can copy it anywhere and it still works offline.

## You don't need to know how to code

- **Tap anything underlined** and it does it for you.
- The **keys under the screen** change with the room you're in.
- Type **`hint`** (or tap the sticky note) when you're stuck. Wren's voice will nudge you.
- Type **`help`** for the everyday commands, and **`map`** to see the house.
- You can also just say things: `go to the kitchen`, `make tea`, `read welcome`.

## Things to do

Brew tea (thump the kettle on the **left**) · feed and earn the trust of Biscuit ·
grow mint, carrots, lavender, pumpkins, and moonflowers that only bloom at night ·
fish off the dock, and maybe meet *Old Marmalade* · cook from Wren's recipe
cards · light the wood stove · listen to Ottoline's morning show on the radio ·
trade letters and parcels with the neighbours · find Wren and Juniper's
constellations through the roof telescope · see a comet · name the fox · write
your own notes · fill the keepsake jar · and light the lantern.

Each night when you `sleep`, the game writes a line in your journal about what
you did that day.

## If you *do* code

It's a real-ish shell. Most of what you'd try works, and a fair bit of it is
answered in character:

```sh
ls -la | grep dsk          # pipes
grep -r Marmalade ~        # grep the whole house
echo "dear diary" > notes/today.txt   # redirect into files that persist
alias morning='brew; feed biscuit; cd garden; water'
!!   history   man fish   ps   top   kill -9 biscuit   sudo make me a sandwich
cat /proc/biscuit/status   cat /etc/hosts   ls /bin   hearthfetch
```

There are a few things that aren't documented anywhere.

## Project layout

```
web/                 the game (plain HTML/CSS/JS, no build step needed to play it)
  index.html         loads everything in order
  style.css          the monitor, the desk, the phosphor themes
  js/00..99-*.js     the game, split by topic (see MODDING.md)
  assets/            VT323 font (SIL Open Font License)
docs/index.html      single-file build (generated)
Hearth.swiftpm/      the iPad app: a WKWebView around the single-file build
tools/build.js       web/ → docs/index.html + Hearth.swiftpm/GameHTML.swift
tools/smoke.js       plays the whole season headlessly, start to finish
```

```sh
npm run build   # rebuild docs/ and the iPad app after changing web/
npm test        # play the full season headlessly (45 checks)
```

Want to add a room, a fish, a neighbour or a command? See **[MODDING.md](MODDING.md)**.
