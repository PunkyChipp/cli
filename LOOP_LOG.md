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
