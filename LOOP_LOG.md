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
