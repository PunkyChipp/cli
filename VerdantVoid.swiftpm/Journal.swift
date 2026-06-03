import SwiftUI

/// A Field Journal entry — a milestone the player discovers through play. Each
/// one found compounds a small permanent production bonus, so completion is its
/// own reward track that never resets.
struct Discovery: Identifiable {
    let id: String
    let title: String
    let hint: String      // shown while still locked
    let flavor: String    // revealed once discovered
    let check: (GameModel) -> Bool
}

enum Journal {
    static let all: [Discovery] = [
        Discovery(id: "first_light", title: "First Light", hint: "Gather something from the dark.",
                  flavor: "The first mote answers your touch. The void is no longer empty.",
                  check: { $0.totalTaps >= 1 }),
        Discovery(id: "colony", title: "A Colony", hint: "Grow ten of the smallest lifeform.",
                  flavor: "Ten spores, then ten more. Life prefers company.",
                  check: { ($0.generators.first?.count ?? 0) >= 10 }),
        Discovery(id: "canopy", title: "Canopy", hint: "Raise your first Tree.",
                  flavor: "Something finally reaches upward instead of merely spreading.",
                  check: { $0.generators.count > 3 && $0.generators[3].count >= 1 }),
        Discovery(id: "elder", title: "Elder", hint: "Grow an Ancient.",
                  flavor: "It remembers a world before you. Now it feeds the world you're making.",
                  check: { $0.generators.count > 5 && $0.generators[5].count >= 1 }),
        Discovery(id: "tapper", title: "Green Thumb", hint: "Tap a thousand times.",
                  flavor: "Your hands know the work now.",
                  check: { $0.totalTaps >= 1000 }),
        Discovery(id: "first_bloom", title: "First Bloom", hint: "Bloom for the first time.",
                  flavor: "You let it all go — and got back something that lasts.",
                  check: { $0.blooms >= 1 }),
        Discovery(id: "pollinator", title: "Pollinator", hint: "Hold 100 Pollen.",
                  flavor: "Gold dust on the wind, carrying tomorrow's gardens.",
                  check: { $0.pollen >= 100 }),
        Discovery(id: "terraformer", title: "Terraformer", hint: "Terraform to a new world.",
                  flavor: "A dead world wakes beneath your roots.",
                  check: { $0.terraforms >= 1 }),
        Discovery(id: "wanderer", title: "Wanderer", hint: "Reach your third world.",
                  flavor: "Each horizon is only the start of the next.",
                  check: { $0.worldIndex >= 2 }),
        Discovery(id: "explorer", title: "Explorer", hint: "Reach the fifth world.",
                  flavor: "You've seen frost and ember. Still you push on.",
                  check: { $0.worldIndex >= 4 }),
        Discovery(id: "voyager", title: "Voyager", hint: "Reach the seventh world.",
                  flavor: "The deep worlds glow with their own strange light.",
                  check: { $0.worldIndex >= 6 }),
        Discovery(id: "worldsend", title: "World's End", hint: "Reach the final world.",
                  flavor: "The Living Star. You made a world that burns with life.",
                  check: { $0.worldIndex >= 9 }),
        Discovery(id: "rooted", title: "Rooted", hint: "Plant your first root node.",
                  flavor: "Below the surface, the real work begins.",
                  check: { !$0.rootNodes.isEmpty }),
        Discovery(id: "network", title: "Network", hint: "Grow a web of eight nodes.",
                  flavor: "Signals pass root to root, faster than any single mind.",
                  check: { $0.rootNodes.count >= 8 }),
        Discovery(id: "lattice", title: "Living Lattice", hint: "Fill twenty cells of the web.",
                  flavor: "Almost the whole lattice hums. The balance is a craft now.",
                  check: { $0.rootNodes.count >= 20 }),
        Discovery(id: "heartwood", title: "Heartwood", hint: "Plant a Heartwood.",
                  flavor: "At the centre, a slow, vast pulse — the web's beating heart.",
                  check: { $0.rootNodes.values.contains(.heartwood) }),
        Discovery(id: "sapflow", title: "Sapflow", hint: "Bank 100 Sap.",
                  flavor: "It rises golden through the dark, patient as tide.",
                  check: { $0.sap >= 100 }),
        Discovery(id: "millionaire", title: "Million Motes", hint: "Hold a million Motes at once.",
                  flavor: "A number you once couldn't imagine, now a passing tide.",
                  check: { $0.motes >= 1e6 }),
        Discovery(id: "billionaire", title: "Billionfold", hint: "Hold a billion Motes.",
                  flavor: "The light pools faster than you can spend it.",
                  check: { $0.motes >= 1e9 }),
        Discovery(id: "automaton", title: "Idle Hands", hint: "Unlock an automation.",
                  flavor: "The garden tends itself now. You only watch it grow.",
                  check: { $0.unlocked("s_autotap") }),
        Discovery(id: "gaia", title: "Gaia Engine", hint: "Automate Terraforming.",
                  flavor: "Worlds bloom and pass without your hand. Godhood, idling.",
                  check: { $0.autoTerraform && $0.unlocked("s_autoterra") }),
        Discovery(id: "singularity", title: "Singularity", hint: "Collapse into a Singularity.",
                  flavor: "Everything, into a single point of dust — and a brighter dawn.",
                  check: { $0.singularities >= 1 }),
        Discovery(id: "reborn", title: "Eternal Return", hint: "Reach three Singularities.",
                  flavor: "You've ended three cosmoses. Each one taught the next.",
                  check: { $0.singularities >= 3 }),
        Discovery(id: "stargazer", title: "Stargazer", hint: "Bank 50 Stardust.",
                  flavor: "Cold fire from dead worlds, reshaped to your design.",
                  check: { $0.stardust >= 50 }),
        Discovery(id: "nightfall", title: "Nightfall", hint: "Live through a Night.",
                  flavor: "In the dark the blooms give most. Patience has its season.",
                  check: { $0.seasonIndex == 3 }),
        Discovery(id: "abundance", title: "Abundance", hint: "Gather 100 Biomass.",
                  flavor: "So much life it spills over. You've come a long way from the void.",
                  check: { $0.biomass >= 100 })
    ]

    static func entry(_ id: String) -> Discovery? { all.first { $0.id == id } }
}

extension GameModel {
    /// +3% production per discovery, compounding. A gentle but real reward.
    var journalMult: Double { pow(1.03, Double(discovered.count)) }

    func checkDiscoveries() {
        for d in Journal.all where !discovered.contains(d.id) {
            if d.check(self) {
                discovered.insert(d.id)
                newlyDiscovered.append(d.id)
            }
        }
    }
}
