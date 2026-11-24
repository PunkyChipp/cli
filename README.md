# HEARTH

*a cottage, a cat, a season.*

Your great-aunt Wren has gone travelling at seventy-eight, and she's left you her
cottage on Lake Ilse for the autumn. Along with the house comes Biscuit (an
orange cat who says she hasn't been fed) and **HEARTH**, a beige 1987 home
computer that Wren wired into every room.

The cottage *is* the filesystem. Rooms are folders. Notes are files. The cat is
PID 1.

You have two weeks until **Lantern Night**, when the lantern on Wren's dock is
always the first light on the lake.

And there's a hum coming from the cellar. Wren's note says to ignore it.
The last thing on the screen when you arrive says *don't tell them about the
noise. let them find it.*

Grow things, fish, cook, write to the neighbours, look after the cat. And,
if you want, find out what Wren has been listening to since 1962. Nobody
will tell you. Whatever you work out gets pinned to the corkboard (`board`).
The real ending is behind something you have to *know*, not something you
have to find.

```
 _  _ ___   _   ___ _____ _  _
| || | __| /_\ | _ \_   _| || |
| __ | _| / _ \|   / | | | __ |
|_||_|___/_/ \_\_|_\ |_| |_||_|
```

## How to play it

Open **`docs/index.html`** in any browser. That one file is the whole game:
no install, no internet needed, and it saves as you go (in the browser's
local storage), so you can close the tab whenever.

To put it online, turn on GitHub Pages for the `docs/` folder (Settings →
Pages → branch, `/docs`) and you get a link you can share.

It works with a keyboard or a touchscreen. A desktop (PC) version is planned
later; the single file is built so it can be wrapped as-is.

## You don't need to know how to code

- **Tap anything underlined** and it does it for you.
- The **keys under the screen** change with the room you're in.
- Type **`hint`** (or tap the sticky note) when you're stuck. Wren's voice will nudge you.
- Type **`help`** for the everyday commands, and **`map`** to see the house.
- You can also just say things: `go to the kitchen`, `make tea`, `read welcome`.

## Things to do

Pin clues to the corkboard · listen to the cellar · brew tea (thump the
kettle on the **left**) · feed and earn the trust of Biscuit ·
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
docs/index.html      single-file build (generated; this is what you play)
tools/build.js       web/ → docs/index.html
tools/smoke.js       plays the whole season headlessly, start to finish
```

```sh
npm run build   # rebuild docs/index.html after changing web/
npm test        # play the full season headlessly, both endings (51 checks)
```

Want to add a room, a fish, a neighbour or a command? See **[MODDING.md](MODDING.md)**.
