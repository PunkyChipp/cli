# Changing HEARTH

Everything is plain JavaScript in `web/js/`, loaded in filename order. No
frameworks, no bundler. To try a change, open `web/index.html` in a browser
and refresh. When you're happy, run:

```sh
npm test          # plays the whole season headlessly. should be all ticks.
npm run build     # updates docs/index.html (the playable single file)
```

> Tip: in the browser console, `localStorage.clear()` then refresh to start
> fresh. In the game, `reset` does the same thing.

## Where things live

| file | what's in it |
|---|---|
| `00-util.js` | helpers: `pick`, `chance`, `clock`, `esc`, `lev` (typo matching) |
| `01-state.js` | **the save file** (`S`), inventory helpers, keepsakes (achievements) |
| `02-term.js` | the terminal: `print`, `type`, `ask`, markup, history, tab-completion |
| `03-audio.js` | every sound, generated with WebAudio (rain, kettle, owls, radio piano) |
| `04-world.js` | time, weather, warmth, Biscuit's wandering, idle moments, new days |
| `05-fs.js` | the filesystem engine (`resolve`, `nodeAt`, `children`) |
| `06-content.js` | **the house**: every room and note. Most of the writing is here |
| `07-people.js` | neighbours, letters, replies to parcels, radio stations |
| `08-garden.js` | crops, planting, watering, overnight growth |
| `09-kitchen.js` | items, recipes, tea, cooking, eating, the cat, the stove |
| `10-fishing.js` | fish table + the fishing minigame, rowing |
| `11-sky.js` | constellations and the telescope |
| `12-commands.js` | **the shell** (`;` `&&` `|` `>` aliases) and everyday commands |
| `13-devtoys.js` | grep/head/wc, sudo, ps/kill, man pages, themes, easter eggs |
| `14-story.js` | mornings, the sticky note, status card, keycaps, **Lantern Night** |
| `15-scene.js` | the pixel-art window |
| `99-boot.js` | the BIOS screen, login, main loop |

## Markup

Anything you `print()` can use:

```
{hi:bright}  {dim:quiet}  {acc:accent}  {ok:green}  {warn:red}  {sky:blue}  {s:struck out}
{cmd:ls -a}      ← shows "ls -a", runs it when tapped
```

Tags nest: `{dim:try {cmd:look}}`. Anything the *player* typed must go
through `esc()` first.

## Recipes for common changes

### A new command

In `12-commands.js` or `13-devtoys.js`:

```js
cmd("wave hello", "wave at someone", (args) => {
  if (catHere()) print("Biscuit watches your hand go back and forth. She is not impressed.");
  else print("You wave at nobody. It's still nice.");
}, { group: "living" });
```

`"wave hello"` means `wave` is the name and `hello` is an alias. `group` decides
where it shows in `help` (`around`, `living`, `garden`, `people`, `help`,
`system`). Add `secret: true` to hide it from help. Make the function `async`
and use `await pause(500)` or `await type("text")` for dramatic timing.

### A new note somewhere in the house

In `06-content.js`, find the room and add a line:

```js
"shopping_list.txt": F("milk\neggs\nsomething for Biscuit that isn't fish (she'll refuse it)"),
```

Make it something you can pick up with `{ item: "spoon" }`, and give the item
a name in `ITEMS` (in `09-kitchen.js`). Hide it with a leading dot
(`.secret.txt`, shown by `ls -a`). Make it only appear at night with
`{ when: () => isNight() }`.

### A new room

Add a `D(...)` next to the others under `cottage:` in `06-content.js`, give
it `{ room: true }`, and add its name to `ROOM_NAMES` in `12-commands.js` so
`cd <room>` works from anywhere. If you want it on the `map` and the
keycaps, see `doMap()` and `contextKeys()`.

### A new fish

One line in `FISH` (`10-fishing.js`):

```js
{ id: "char", w: 6, win: 800, size: [20, 40], when: () => isMorning() && weatherNow().fog > 0.5,
  line: "An arctic char, pink-bellied and cold as the lake bottom." },
```

`w` is how common it is, `win` is how many milliseconds you get to react.

### A new crop

One line in `CROPS` (`08-garden.js`), plus a name in `ITEMS`. Give the player
seeds by putting `"seed:yourcrop"` in a letter's `reward`, or as a takeable
file with `{ item: "seed:yourcrop", count: 3 }`.

### A new letter

Add it to `LETTERS` in `07-people.js`. `day` is the morning it arrives:

```js
fenn_rain: { from: "fenn", day: 6, subject: "Rain.", text: () => `${NAME()}.\n\nRain. Bees cross. Me too.\n\n{dim:A. Fenn.}`,
  reward: { honey: 1 } },
```

What people *say back* when you send them things lives in `reply()` in the
same file.

### A new keepsake (achievement)

Add it to `KEEPSAKES` in `01-state.js`, then call `keepsake("your_id")`
wherever it should happen.

## Changing it with Claude Code

Claude Code works well on this project because each topic is in its own file.
Good prompts are **specific about the feeling**, **point at the file**, and
**ask for the test to pass**:

> "In `web/js/10-fishing.js`, add a rare 'ghost carp' that only bites on foggy
> nights after Lantern Night. Give it a short, slightly eerie catch scene like
> Old Marmalade's. Add it to the fishlog. Run `npm test` and `npm run build`."

> "Add a new neighbour, a retired ferry captain called Maud, who writes on day
> 6 asking for pike. Match the voice of the other letters in `07-people.js`:
> short, specific, a bit funny. Add her to `PEOPLE`, `reply()` and `friends`."

> "The garden feels slow in the first two days. Suggest two changes to
> `08-garden.js` to make it feel better, explain why, and wait for me
> before changing anything."

Less helpful: "make the game better". It has nothing to aim at.
