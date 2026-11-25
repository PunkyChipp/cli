/* =====================================================================
   17-visitors.js — people dropping by.

   The fridge note says "milk — Ottoline, Tues" and "eggs — Fenn", and
   Pip's letter says Wren let her use HEARTH on Saturdays. So those
   things happen. Small, once each, only if you're indoors at the time.
   Day 1 is a Wednesday: Saturdays are days 4 and 11, Tuesdays 7 and 14.
   ===================================================================== */
"use strict";

const VISITS = [
  { id: "otto_milk_1", day: 7, from: 8 * 60, to: 12 * 60, run: () => [
    "{dim:a knock at the front door. by the time you get there, Ottoline is already halfway back down the path.}",
    "{acc:OTTOLINE:} Milk! Tuesdays. Wren never told you? Course she didn't.",
    "{acc:OTTOLINE:} " + (S.disks.radio ? "I can hear you've got the radio going. Good." : "You've still not got that radio on, have you."),
    "{dim:two pints on the step, and a paper bag with a scone in it that nobody mentions.}"
  ], after: () => befriend("ottoline", 1) },
  { id: "otto_milk_2", day: 14, from: 8 * 60, to: 12 * 60, run: () => [
    "{dim:a knock. Ottoline, in a coat she's clearly saving for tonight.}",
    "{acc:OTTOLINE:} Milk. And I'm not stopping, I've forty jam jars to wash.",
    "{acc:OTTOLINE:} We'll be on the water from six. Take your time. We always wait.",
  ], after: () => befriend("ottoline", 1) },
  { id: "fenn_eggs_1", day: 4, from: 7 * 60, to: 11 * 60, run: () => [
    "{dim:you hear the gate. when you look out, there's nobody there. on the step: a box of six brown eggs, and a note in pencil.}",
    "{ok:  Eggs.}",
    "{ok:  A.F.}"
  ], after: () => befriend("fenn", 1) },
  { id: "fenn_eggs_2", day: 11, from: 7 * 60, to: 11 * 60, run: () => [
    "{dim:eggs on the step again. this time the note says more.}",
    "{ok:  Eggs. The bees won't go near the water this week.}",
    "{ok:  Forty years and they've never done that. A.F.}"
  ], after: () => { befriend("fenn", 1); clue("lights"); } },
  { id: "pip_sat_1", day: 4, from: 13 * 60, to: 17 * 60, when: () => S.letters.includes("pip_hello"), run: () => [
    "{dim:a knock, then the door opening before you get to it. a girl with a bike helmet still on.}",
    "{sky:PIP:} It's SATURDAY. Wren lets me use HEARTH on Saturdays. Is that still a thing? It's still a thing.",
    "{dim:she sits at the desk for twenty minutes, typing very fast and mostly making the kettle beep. before she goes she leaves a file in your notes folder.}",
    "{sky:PIP:} It's a drawing of Biscuit. Don't look at it till I've gone."
  ], after: () => { befriend("pip", 1); S.files["/cottage/study/notes/biscuit_by_pip.txt"] = "     /\\_/\\\n    ( o o )   BISCUIT\n    =( Y )=   by PIP\n     )   (\n    (_)-(_)   (she is fatter than this)"; } },
  { id: "pip_sat_2", day: 11, from: 13 * 60, to: 17 * 60, when: () => S.letters.includes("pip_hello"), run: () => [
    "{dim:Pip again, helmet on, out of breath.}",
    "{sky:PIP:} Have you found the voice yet? On the radio. Go between the stations, low down. 77-something. It says KETTLE.",
    "{sky:PIP:} I'm not scared of it. I'm just saying it's there.",
    "{dim:she won't stay. she says she has to get home before it's dark, and then looks at the lake.}"
  ], after: () => befriend("pip", 1) }
];

/** Called once a second from the world tick. At most one visit at a time. */
function maybeVisit() {
  if (T.busy || T.asking || !S.name || T.ending) return;
  if (!["hall", "kitchen", "study", "parlour", "cellar"].includes(roomName())) return;
  S.flags.visits = S.flags.visits || {};
  for (const v of VISITS) {
    if (S.flags.visits[v.id] || v.day !== S.day || S.min < v.from || S.min > v.to) continue;
    if (v.when && !v.when()) continue;
    S.flags.visits[v.id] = true;
    sfx("door");
    print("");
    for (const l of v.run()) print(l);
    if (v.after) v.after();
    remember({ otto_milk_1: "Ottoline brought milk.", otto_milk_2: "Ottoline brought milk. 'we always wait.'", fenn_eggs_1: "eggs from Fenn on the step.", fenn_eggs_2: "Fenn says the bees won't go near the water.", pip_sat_1: "Pip came round to use HEARTH. left me a drawing of Biscuit.", pip_sat_2: "Pip came round. she's found the voice on the radio too." }[v.id]);
    showLine(true);
    return;
  }
}
