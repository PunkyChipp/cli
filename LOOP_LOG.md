# Loop log

What each unattended improvement pass changed. Newest at the bottom.

## 1 — first ten minutes
- `help` was a 50-line wall. It now shows the nine commands a new player needs; everything else is under `help all`.
- Entering a room for the first time now lists its doors, so you can wander by tapping without knowing about `look`.

## 2 — talking to it like a person
- Plain English now works: "read the note", "go downstairs", "examine the box", "what is the hum", "check mail", "turn on the radio", "pick up the rod", "open the shed", "look in the drawer", "go to bed", "talk to fenn", "what now". Real commands pass straight through untouched.
- Looking at something that's in another room tells you where it is ("there's one in the kitchen") instead of a file error.
- Opening a shed, drawer or tin describes it and shows what's inside.
- Typo suggestions no longer offer secret commands ("check" used to suggest "hack").

## 3 — rough edges from a slow first morning
- The hall's `look` no longer lists every room in the house as "in here". It just shows its real doors.
- Sitting down gives a proper line ("You watch the window. A thin drizzle.") instead of a bare weather fragment.
- The study's corkboard reads naturally ("empty" / "with a few things pinned to it now").
- Ottoline no longer says "welcome" twice in a row on air.
- The map says "on the dock" / "on the roof".
- The radio-install line is plainer.

## 4 — the end of a day
- The nightly journal is now written like a person would: the one or two things that mattered, the ordinary stuff squashed into a list ("also tea, fed B., mint in."), and sometimes a last line about the weather or the hum. It used to be a run-on log of every action.
- The keepsake jar no longer prints 22 lines of "????". It shows what you've found and "room for N more".
- People you haven't heard from yet show as "not met yet" (it said "them" for everyone).
- The stove tells you where the matches are instead of a riddle.

## 5 — the lake at night
- Looking into the water from the dock now rewards patience. The first look is just dark water, the second you crouch and wait, and by the third your eyes have adjusted and (from about a week in) you see the light. It used to roll dice and repeat "Probably not." word for word.
- Each look costs a few minutes of game time, so waiting feels like waiting.
- Rewrote the rowing scene in plain language (the "wobble, wobble, fine" and "like a lighthouse keeper" draft is gone).

## 6 — quip sweep
- Went through the everyday responses (moving, taking things, the cat's key, small talk, the dead radio, wrong-room messages) and cut the ones that were trying too hard: "very here", "forty pounds of liquid", "HEARTH blushes, as much as beige can", "'Earn it,' says her face", "dead as a doornail", "you respect the label". Replaced them with short plain lines.
- Getting Biscuit's key is quieter now: she bumps your hand and walks off, rather than narrating what it means.

## 7 — people drop by
- The fridge note said "milk — Ottoline, Tues" and "eggs — Fenn"; Pip's letter said Wren let her use HEARTH on Saturdays. Those now actually happen, once each, if you're indoors at the time: Ottoline with milk (and an unmentioned scone) on Tuesdays, Fenn's eggs left on the step on Saturday mornings with a one-word note, Pip turning up on Saturday afternoons.
- The visits carry a little of the mystery: Fenn's second note says the bees won't go near the water; Pip's second visit points at the voice on 77.7. Both are extra ways to find clues you could also find elsewhere.
- New file: `web/js/17-visitors.js`. Smoke test covers a visit (52 steps).

## 8 — the paper card
- The paper card beside the window had a big empty bottom half. It now has two handwritten-style notes: what's in your coat (no need to type `pockets`) and the last few things you pinned to the board. Checked at 1366×768, the common laptop size, ready for the PC version later. Hidden on portrait/phone layouts where there's no room.

## 9 — the computer-ish bits
- `fortune` used greeting-card platitudes ("Every room is warmer with a book in it"). It now quotes people and things in the game: Wren's notes, the gardening book, Fenn, Ottoline, Pip, the back of the 1974 photo, the pencil in the HEARTH manual. Some of them are quiet clues.
- Toned down `whoami`, `exit`, `coffee`, `python`, `npm`, `top`, `sl` and `credits`, which were each doing a little bit.
- `top`/`uptime` say "1 day", not "1 days".
- The carp is "the carp" everywhere now (man page, fishlog, keepsake), not "Old Marmalade" in some places.

## 10 — coming back
- Reopening the game used to greet you with a status dump ("Sam, 6:19am, Wednesday October 12. drizzly. you're in the kitchen."). Now it puts you back in the room: the time, where you are, what's outside, the last couple of things you did ("last thing you remember: made black tea. fed Biscuit."), or last night's journal line if it's a new morning, plus the cat if she's there.

## 11 — Biscuit decides about you
- Once Biscuit trusts you (the same trust that eventually gets you the trunk key), she sometimes follows you from room to room: "Biscuit follows you in." / "You hear Biscuit behind you on the stairs." It's the game's way of showing her trust without a meter, and a sign the key isn't far off. She won't follow you onto the roof, or down the dock in the rain.

## 12 — fishing, played for real
- Played fishing with real timing (a catch, an early strike, a miss). The timing feels fair; the words didn't.
- The bite cue was an arcade shout ("!! the float dips — NOW!"). It's now "the float goes under — now!", which is still clear but sounds like a lake.
- Early strikes and misses are plain ("Too soon. The float hadn't moved." / "Missed it. The float comes back up, empty.") instead of "Whoops" and an embarrassed duck.
- First cast ever: one dim line explains the rule (watch the float; when it goes under, press enter or tap; not before), so nobody has to learn it by failing.

## 13 — after merging #3: the rhythm problem
- Counted the tells: 110 em-dashes and 239 parenthetical asides in the game text, plus every description written as a clipped list of fragments ("Stone walls, a bulb on a string, shelves of jam."). That uniform rhythm is a big part of what reads as AI.
- Rewrote the opening, every room description and the weather lines in ordinary, uneven sentences with specific details ("You have to duck under the beam at the bottom of the steps.", "awake since four... came downstairs in your socks").
- Took the em-dashes out of player-facing prose (list separators are now a quiet dot).

## 14 — the things in the house
- Rewrote about 40 object and container descriptions (everything you `cat`/`examine` or open) from clipped fragments ("A ball of string.", "Rubber bands. A lot of them.", "Orange, and shaped like Wren.") into ordinary sentences with one specific, lived-in detail each: the mug ring on the armchair, the postman's red rubber bands Wren picks up off the path, the yellow mac missing so "she's taken the good coat", the teaspoon lure that looks the most used.

## 15 — mornings
- Rewrote the day-specific morning lines, the generic ones, falling asleep at the desk, the garden and post notices, and going to bed. Out with "Fog right up to the windows." / "Not asleep. Watching." / "Under the house, the hum."; in with full sentences that notice one real thing ("You wake up because something is standing on you. It's Biscuit...", "There's frost on the inside of the bedroom window, and you can see your breath in the hall.").
