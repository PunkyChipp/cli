# Verdant Void 🌱

An idle / incremental game for **Swift Playgrounds on iPad (iOS 26)**. Seed life
into dead worlds, grow it into an exponential garden, then reset it all for power
and travel to entirely new worlds.

Inspired by the feel of *Grass Cutting Incremental* (the satisfying tap loop and
the thrill of entering a brand-new zone), but with its own mechanics and theme.

## How to run

1. Copy the **`VerdantVoid.swiftpm`** folder onto your iPad (AirDrop, Files,
   iCloud Drive, or `git clone`).
2. Tap it to open in **Swift Playgrounds** (or open it in Xcode on a Mac).
3. Press **Run**. The game autosaves and keeps progressing while you're away.

Targets iOS 17+ APIs, so it runs great on iOS 26.

## Three difficulty modes

Chosen on first launch and changeable any time in **Settings** — difficulty only
changes the **game speed**:

| Mode   | Speed | Feel |
|--------|-------|------|
| Easy   | 2.0×  | Relaxed climb, great for a first run |
| Medium | 1.0×  | The intended balance |
| Hard   | 0.5×  | Every reset layer matters |

## The core loop

- **Tap** the world orb to gather **Motes**.
- Buy **6 tiers of lifeforms** (Spore → Sprout → Shrub → Tree → Grove → Ancient).
  Each tier produces the one below it, so growth snowballs exponentially.
- Spend Motes on **upgrades** (tap power, production, cheaper costs…).

## Four stacked reset layers

Each layer resets the ones beneath it for a more powerful currency:

1. **Bloom → Pollen.** Reset Motes/generators for Pollen, a permanent production
   multiplier plus its own upgrade shop.
2. **Terraform → Biomass.** Reset the Mote + Pollen layers, gain Biomass, and
   travel to the **next world**. There are **9 hand-themed worlds** — Barren Void,
   Mossfield Flats, Ashen Wastes, Frostfall Tundra, Verdant Expanse, Crystal
   Caverns, Sunken Abyss, Emberforge Core, Stormcrest Skies, and The Living Star.
   Each re-skins the whole game (sky, accent, glyph) and boosts production, so
   crossing over genuinely feels like arriving somewhere new.
3. **Singularity → Stardust.** Collapse everything into Stardust, spent on a
   permanent **Cosmos tech tree** with global multipliers and game-speed boosts.
4. **Automation** (unlocked via Stardust tech): Auto-Tap, Auto-Buy generators,
   Auto-Bloom, and Auto-Terraform — so the late game idles itself.

## Other touches

- Offline progress (capped, and the cap is upgradable).
- Floating tap numbers and a pulsing, per-world themed orb.
- Full save/load via `UserDefaults`, plus an erase-progress option.

## Project layout (`VerdantVoid.swiftpm/`)

| File | Purpose |
|------|---------|
| `Package.swift` | Swift Playgrounds app manifest |
| `MyApp.swift` | `@main` entry point |
| `Model.swift` | Game state, economy, reset layers, save/load, tick loop |
| `Theme.swift` | The 9 world definitions + colors |
| `Format.swift` | Big-number / time formatting |
| `Components.swift` | Reusable UI (currency bar, cards, buttons) |
| `ContentView.swift` | Tab layout + first-run difficulty picker |
| `WorldView.swift` | Tap surface |
| `GrowView.swift` | Generators |
| `UpgradesView.swift` | Per-currency upgrade shops |
| `PrestigeView.swift` | Bloom / Terraform / Singularity |
| `CosmosView.swift` | Stardust tech + automation |
| `SettingsView.swift` | Difficulty, stats, save management |
