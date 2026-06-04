import SwiftUI

// MARK: - Collection cards (the "Spore Codex")
//
// A deckbuilding meta-layer unlocked at the first Singularity. You spend Stardust
// on Spore Packs; each pack hands you a card you don't own yet, drawn from the
// lowest rarity you haven't completed (deterministic pity — no bad-luck dupes).
// Completing a rarity permanently raises the global bonus AND grants another equip
// slot. You can only equip a few cards at once, so the game is choosing a build.

enum CardRarity: String, CaseIterable, Codable, Identifiable {
    case common, rare, epic, legendary
    var id: String { rawValue }
    var order: Int { CardRarity.allCases.firstIndex(of: self) ?? 0 }
    var name: String { rawValue.capitalized }
    var color: Color {
        switch self {
        case .common:    return Color(hex: 0x9be7a6)
        case .rare:      return Color(hex: 0x6fb8ff)
        case .epic:      return Color(hex: 0xc6a0ff)
        case .legendary: return Color(hex: 0xffd86b)
        }
    }
}

enum CardEffect {
    case production   // ×power to all production
    case tap          // ×power to tap value
    case sap          // ×power to Sap gain
    case cost         // ×power to generator costs (power < 1)
    case offline      // +power seconds to the offline cap
    case amp          // multiplies the bonus of every *other* equipped card
}

struct CardDef: Identifiable {
    let id: String
    let name: String
    let rarity: CardRarity
    let glyph: String
    let effect: CardEffect
    let power: Double
    let flavor: String

    /// Short human description of the effect.
    var blurb: String {
        let x = String(format: "%.2f", power)
        switch effect {
        case .production: return "All production ×\(x)"
        case .tap:        return "Tap value ×\(x)"
        case .sap:        return "Sap gain ×\(x)"
        case .cost:       return "Generator costs ×\(x) (cheaper)"
        case .offline:    return "+\(fmtTime(power)) offline cap"
        case .amp:        return "Boosts every other equipped card ×\(x)"
        }
    }
}

enum Cards {
    static let all: [CardDef] = [
        // Common
        CardDef(id: "c_spark", name: "Sparkmoss",     rarity: .common, glyph: "sparkle",
                effect: .production, power: 1.15, flavor: "It glows when you aren't looking."),
        CardDef(id: "c_dew",   name: "Dewdrop",       rarity: .common, glyph: "drop.fill",
                effect: .sap, power: 1.4, flavor: "Each bead holds a little of the night."),
        CardDef(id: "c_touch", name: "Green Fingers", rarity: .common, glyph: "hand.tap.fill",
                effect: .tap, power: 1.6, flavor: "The garden leans toward your hand."),
        CardDef(id: "c_thrift", name: "Thrift Vine",  rarity: .common, glyph: "scissors",
                effect: .cost, power: 0.92, flavor: "Grows fastest where soil is poor."),
        // Rare
        CardDef(id: "r_radiance", name: "Radiant Bloom", rarity: .rare, glyph: "circle.grid.cross.fill",
                effect: .production, power: 1.4, flavor: "A flower that remembers the sun."),
        CardDef(id: "r_well",  name: "Deep Well",     rarity: .rare, glyph: "humidity.fill",
                effect: .sap, power: 2.0, flavor: "It goes down further than the world is old."),
        CardDef(id: "r_dawn",  name: "Dawnlight",     rarity: .rare, glyph: "sunrise.fill",
                effect: .tap, power: 2.6, flavor: "First light is always the brightest."),
        // Epic
        CardDef(id: "e_engine", name: "Living Engine", rarity: .epic, glyph: "gearshape.2.fill",
                effect: .production, power: 1.9, flavor: "Biology, but it ticks like a clock."),
        CardDef(id: "e_hoard", name: "Patient Hoard", rarity: .epic, glyph: "moon.zzz.fill",
                effect: .offline, power: 14_400, flavor: "Sleep is just slow growing."),
        CardDef(id: "e_econ",  name: "Mycelial Economy", rarity: .epic, glyph: "point.3.connected.trianglepath.dotted",
                effect: .cost, power: 0.78, flavor: "The whole forest shares one purse."),
        // Legendary
        CardDef(id: "l_heart", name: "Worldheart",    rarity: .legendary, glyph: "globe.americas.fill",
                effect: .production, power: 3.0, flavor: "Every world you ever grew, beating at once."),
        CardDef(id: "l_crown", name: "Symbiotic Crown", rarity: .legendary, glyph: "crown.fill",
                effect: .amp, power: 1.6, flavor: "It does nothing alone. Together, everything.")
    ]

    static func def(_ id: String) -> CardDef? { all.first { $0.id == id } }
    static func of(_ rarity: CardRarity) -> [CardDef] { all.filter { $0.rarity == rarity } }
}

extension GameModel {

    var cardsUnlocked: Bool { singularities >= 1 || stardust > 0 || !ownedCards.isEmpty }

    // MARK: Slots & set completion

    /// Rarities the player has fully collected.
    var completedRarities: Int {
        CardRarity.allCases.filter { r in
            let pool = Cards.of(r)
            return !pool.isEmpty && pool.allSatisfy { ownedCards.contains($0.id) }
        }.count
    }
    /// 4 base slots, +1 per completed rarity (max 8).
    var cardSlots: Int { min(8, 4 + completedRarities) }
    /// Permanent global bonus for completing rarities.
    var cardSetMult: Double { pow(1.5, Double(completedRarities)) }

    // MARK: Pulls

    var packCost: Double { 3.0 * pow(1.6, Double(packsPulled)) }

    /// Lowest rarity that still has unowned cards AND whose predecessor is complete.
    var nextPullRarity: CardRarity? {
        for r in CardRarity.allCases {
            let pool = Cards.of(r)
            let complete = pool.allSatisfy { ownedCards.contains($0.id) }
            if !complete { return r }   // first incomplete rarity in order
        }
        return nil
    }
    var canPull: Bool { cardsUnlocked && nextPullRarity != nil && stardust >= packCost }

    func pullPack() {
        guard canPull, let r = nextPullRarity else { return }
        let unowned = Cards.of(r).filter { !ownedCards.contains($0.id) }
        guard let pick = unowned.randomElement() else { return }
        stardust -= packCost
        packsPulled += 1
        ownedCards.insert(pick.id)
        // Auto-equip into a free slot for immediate gratification.
        if equippedCards.count < cardSlots { equippedCards.append(pick.id) }
    }

    // MARK: Equip

    func isEquipped(_ id: String) -> Bool { equippedCards.contains(id) }

    func toggleEquip(_ id: String) {
        guard ownedCards.contains(id) else { return }
        if let idx = equippedCards.firstIndex(of: id) {
            equippedCards.remove(at: idx)
        } else if equippedCards.count < cardSlots {
            equippedCards.append(id)
        }
    }

    var equippedDefs: [CardDef] { equippedCards.compactMap { Cards.def($0) } }

    /// Symbiotic Crown and friends: the product of all equipped amp cards' power.
    private var cardAmp: Double {
        equippedDefs.filter { if case .amp = $0.effect { return true } else { return false } }
            .reduce(1.0) { $0 * $1.power }
    }

    /// Multiplier from one effect kind across equipped cards, amplified by amp cards.
    private func cardBonus(_ match: (CardEffect) -> Bool) -> Double {
        let amp = cardAmp
        var m = 1.0
        for d in equippedDefs where match(d.effect) {
            m *= 1.0 + (d.power - 1.0) * amp
        }
        return m
    }

    var cardMult: Double {
        cardSetMult * cardBonus { if case .production = $0 { return true } else { return false } }
    }
    var cardTapMult: Double {
        cardBonus { if case .tap = $0 { return true } else { return false } }
    }
    var cardSapMult: Double {
        cardBonus { if case .sap = $0 { return true } else { return false } }
    }
    /// Generator-cost multiplier (≤ 1). Reductions are amplified by amp cards.
    var cardCostMult: Double {
        let amp = cardAmp
        var m = 1.0
        for d in equippedDefs {
            if case .cost = d.effect { m *= max(0.1, 1.0 - (1.0 - d.power) * amp) }
        }
        return m
    }
    /// Extra offline-cap seconds, amplified by amp cards.
    var cardOfflineBonus: Double {
        let amp = cardAmp
        var s = 0.0
        for d in equippedDefs {
            if case .offline = d.effect { s += d.power * amp }
        }
        return s
    }
}
