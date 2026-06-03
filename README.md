# Verdant Void 🌱

An idle / incremental game for **Swift Playgrounds on iPad (iOS 26)**. Seed life
into dead worlds, grow it into an exponential garden, weave a glowing root-web
beneath the surface, and reset it all for power across nine hand-themed worlds.

Inspired by the *feel* of *Grass Cutting Incremental* — the satisfying tap loop,
the thrill of a new zone, and systems that are more than "number go up" (its
Constellations, Solarians, and Gauntlet) — but with its own mechanics, theme,
and art.

## Art direction: bioluminescent line-art

Everything is drawn **procedurally in code** (`Canvas` / `Path`), no images:
near-black world-fields lit by glowing organic lines, drifting fireflies, a
celestial orb that tracks the day/night cycle, and a central **living organism**
on the tap screen that visibly grows as you progress.

## How to run

1. Copy the **`VerdantVoid.swiftpm`** folder onto your iPad (or unzip the
   provided zip). Keep it in the Files app.
2. Tap the **whole `.swiftpm` folder** to open it in **Swift Playgrounds**
   (or open it in Xcode on a Mac). Don't open an individual `.swift` file.
3. Press **Run**. It autosaves and keeps progressing while you're away.

## Three difficulty modes

Chosen on first launch, changeable any time in **Settings** — difficulty only
changes the **game speed**: Easy 2×, Medium 1×, Hard 0.5×.

## The core loop

- **Tap** the glowing bloom to gather **Motes** (with light-ring + drifting
  number feedback).
- Buy **6 tiers of lifeforms** (Spore → … → Ancient); each tier grows the one
  below, so production snowballs exponentially.
- Spend Motes on **upgrades** (tap power, production, cheaper costs…).

## Reset layers & deeper systems

1. **Bloom → Pollen.** Reset for a permanent multiplier + its own shop.
2. **Terraform → Biomass.** Reset the Mote+Pollen layers, gain Biomass, and
   travel to the **next of 9 worlds** — each re-skins the entire game (its own
   glow palette) and boosts production.
3. **Singularity → Stardust.** Collapse everything into a permanent **Cosmos
   tech tree** + automation (Auto-Tap / Buy / Bloom / Terraform).
4. **The Root Web** *(unlocks after your first Terraform).* A 5×5 lattice you
   grow with **Sap**. The puzzle: every node draws **Water**; overdraw your
   budget and the web **wilts**. **Nodules** raise the budget, **Conduits** boost
   neighbours, **Bloomcaps** reward clusters, a **Heartwood** multiplies the whole
   web. *Placement* is the game.
5. **The Long Year.** A Dawn → Day → Dusk → Night cycle that re-skins the sky and
   shifts which action pays best (tap, production, Sap, or Bloom).
6. **Field Journal.** 26 discoveries found through play, each granting a small
   permanent compounding bonus, announced with a toast.

Plus capped, upgradable offline progress and full save/load.

## Project layout (`VerdantVoid.swiftpm/`)

| File | Purpose |
|------|---------|
| `Package.swift`, `MyApp.swift` | Swift Playgrounds manifest + `@main` |
| `Model.swift` | State, economy, reset layers, save/load, tick loop |
| `RootWeb.swift` / `RootWebView.swift` | Root Web logic + interactive board |
| `Seasons.swift` | The Long Year cycle + multipliers |
| `Journal.swift` / `JournalView.swift` | Discoveries + bonuses |
| `Theme.swift` | The 9 worlds + glow palettes |
| `Visuals.swift` | Procedural glow art: background, organism, helpers |
| `Components.swift` | Reusable UI (currency bar, glow cards/buttons) |
| `Format.swift` | Big-number / time formatting |
| `ContentView.swift` | Tabs, background, first-run picker, toast |
| `WorldView` / `GrowView` / `UpgradesView` / `PrestigeView` / `CosmosView` / `SettingsView` | Screens |

## Building / CI

A GitHub Actions workflow (`.github/workflows/build.yml`) compiles the package
on a macOS runner so changes are type-checked without an Apple machine locally.
