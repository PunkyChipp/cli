import SwiftUI
import Observation

// MARK: - Difficulty

enum Difficulty: String, CaseIterable, Codable, Identifiable {
    case easy, medium, hard
    var id: String { rawValue }

    /// Global speed multiplier applied to all production. Faster = easier.
    var speed: Double {
        switch self {
        case .easy:   return 2.0
        case .medium: return 1.0
        case .hard:   return 0.5
        }
    }
    var label: String { rawValue.capitalized }
    var blurb: String {
        switch self {
        case .easy:   return "2x speed. A relaxed climb — great for a first run."
        case .medium: return "Standard pace. The intended balance."
        case .hard:   return "Half speed. Every reset layer matters. For veterans."
        }
    }
    var glyph: String {
        switch self {
        case .easy:   return "tortoise.fill"
        case .medium: return "figure.walk"
        case .hard:   return "hare.fill"
        }
    }
}

// MARK: - Currencies

enum Currency: String, CaseIterable, Codable, Identifiable {
    case motes, pollen, biomass, stardust
    var id: String { rawValue }
    var name: String {
        switch self {
        case .motes:    return "Motes"
        case .pollen:   return "Pollen"
        case .biomass:  return "Biomass"
        case .stardust: return "Stardust"
        }
    }
    var glyph: String {
        switch self {
        case .motes:    return "sparkle"
        case .pollen:   return "circle.grid.cross.fill"
        case .biomass:  return "leaf.circle.fill"
        case .stardust: return "star.fill"
        }
    }
    var color: Color {
        switch self {
        case .motes:    return Color(hex: 0x9be7a6)
        case .pollen:   return Color(hex: 0xffe27a)
        case .biomass:  return Color(hex: 0x7ad6a0)
        case .stardust: return Color(hex: 0xc6a0ff)
        }
    }
}

// MARK: - Generators

struct Generator: Identifiable {
    let id: Int
    let name: String
    let glyph: String
    let baseCost: Double
    let costGrowth: Double
    let baseProd: Double
    var count: Double = 0
    var bought: Int = 0

    /// Raw cost of the next purchase, before global cost modifiers.
    var rawCost: Double { baseCost * pow(costGrowth, Double(bought)) }
}

// MARK: - Upgrade definitions

struct UpgradeDef: Identifiable {
    let id: String
    let name: String
    let info: String
    let currency: Currency
    let maxLevel: Int
    let baseCost: Double
    let growth: Double

    func cost(at level: Int) -> Double { baseCost * pow(growth, Double(level)) }
}

// MARK: - Game model

@Observable
final class GameModel {

    // --- Currencies ---
    var motes: Double = 0
    var pollen: Double = 0
    var biomass: Double = 0
    var stardust: Double = 0

    // --- Generators & upgrades ---
    var generators: [Generator] = GameModel.defaultGenerators()
    var upgradeLevels: [String: Int] = [:]

    // --- Progression ---
    var worldIndex: Int = 0
    var difficulty: Difficulty = .medium

    // --- Run / lifetime stats ---
    var motesEarnedThisBloom: Double = 0
    var totalTaps: Int = 0
    var blooms: Int = 0
    var terraforms: Int = 0
    var singularities: Int = 0

    // --- Automation toggles (only effective once unlocked via Stardust) ---
    var autoTap = false
    var autoBuyGens = false
    var autoBloom = false
    var autoTerraform = false

    // --- Session / meta ---
    var hasChosenDifficulty = false
    var lastSave = Date()
    var lastTick = Date()
    var offlineMotes: Double = 0
    var offlineSeconds: Double = 0

    private var timer: Timer?

    init() {
        load()
    }

    // MARK: Default content

    static func defaultGenerators() -> [Generator] {
        return [
            Generator(id: 0, name: "Spore",   glyph: "circle.hexagongrid.fill", baseCost: 10,    costGrowth: 1.12, baseProd: 1.0),
            Generator(id: 1, name: "Sprout",  glyph: "leaf.fill",               baseCost: 120,   costGrowth: 1.14, baseProd: 0.25),
            Generator(id: 2, name: "Shrub",   glyph: "camera.macro",            baseCost: 1.4e3, costGrowth: 1.16, baseProd: 0.18),
            Generator(id: 3, name: "Tree",    glyph: "tree.fill",               baseCost: 2.0e4, costGrowth: 1.18, baseProd: 0.14),
            Generator(id: 4, name: "Grove",   glyph: "leaf.circle.fill",        baseCost: 4.0e5, costGrowth: 1.20, baseProd: 0.11),
            Generator(id: 5, name: "Ancient", glyph: "laurel.leading",          baseCost: 1.0e7, costGrowth: 1.22, baseProd: 0.09)
        ]
    }

    static let upgrades: [UpgradeDef] = [
        // --- Mote upgrades (reset every Bloom) ---
        UpgradeDef(id: "tap1",  name: "Sharper Touch", info: "Doubles the Motes gained per tap.",
                   currency: .motes, maxLevel: 25, baseCost: 50, growth: 3.4),
        UpgradeDef(id: "prod1", name: "Fertile Soil",  info: "All production ×1.5.",
                   currency: .motes, maxLevel: 30, baseCost: 250, growth: 4.6),
        UpgradeDef(id: "tier1", name: "Spore Surge",   info: "Spore output ×2.",
                   currency: .motes, maxLevel: 15, baseCost: 600, growth: 5.5),
        UpgradeDef(id: "cost1", name: "Lean Roots",    info: "Generator costs ×0.96 (cheaper).",
                   currency: .motes, maxLevel: 12, baseCost: 2.0e3, growth: 7.0),

        // --- Pollen upgrades (reset every Terraform) ---
        UpgradeDef(id: "p_pot",   name: "Pollen Potency",  info: "Each Pollen gives a stronger global bonus.",
                   currency: .pollen, maxLevel: 25, baseCost: 2, growth: 1.55),
        UpgradeDef(id: "p_prod",  name: "Blooming Growth", info: "All production ×2.",
                   currency: .pollen, maxLevel: 20, baseCost: 4, growth: 1.9),
        UpgradeDef(id: "p_click", name: "Pollinator",      info: "Tap value ×3.",
                   currency: .pollen, maxLevel: 12, baseCost: 3, growth: 1.8),
        UpgradeDef(id: "p_start", name: "Head Start",      info: "Begin each Bloom with free Spores (×10 per level).",
                   currency: .pollen, maxLevel: 10, baseCost: 8, growth: 2.4),

        // --- Biomass upgrades (reset every Singularity) ---
        UpgradeDef(id: "b_mult",  name: "Living Soil",  info: "Global production ×1.6.",
                   currency: .biomass, maxLevel: 30, baseCost: 3, growth: 1.5),
        UpgradeDef(id: "b_world", name: "Terraformer",  info: "Strengthens the bonus from your current world.",
                   currency: .biomass, maxLevel: 25, baseCost: 5, growth: 1.65),
        UpgradeDef(id: "b_off",   name: "Deep Roots",   info: "+2h to the offline-progress cap.",
                   currency: .biomass, maxLevel: 12, baseCost: 4, growth: 1.6),
        UpgradeDef(id: "b_cheap", name: "Symbiosis",    info: "Generator base costs ×0.85.",
                   currency: .biomass, maxLevel: 10, baseCost: 10, growth: 2.0),

        // --- Stardust tech (permanent) ---
        UpgradeDef(id: "s_mult",  name: "Cosmic Radiance",  info: "Global production ×2.",
                   currency: .stardust, maxLevel: 50, baseCost: 2, growth: 1.4),
        UpgradeDef(id: "s_speed", name: "Time Dilation",    info: "+0.15 to the game speed multiplier.",
                   currency: .stardust, maxLevel: 20, baseCost: 5, growth: 1.7),
        UpgradeDef(id: "s_start", name: "Stellar Endowment",info: "Start each Singularity with Biomass (×5 per level).",
                   currency: .stardust, maxLevel: 12, baseCost: 10, growth: 1.9),
        UpgradeDef(id: "s_autotap",   name: "Automaton Hands", info: "Unlocks Auto-Tap.",
                   currency: .stardust, maxLevel: 1, baseCost: 4, growth: 1),
        UpgradeDef(id: "s_autogen",   name: "Self-Assembly",   info: "Unlocks Auto-Buy generators.",
                   currency: .stardust, maxLevel: 1, baseCost: 12, growth: 1),
        UpgradeDef(id: "s_autobloom", name: "Eternal Bloom",   info: "Unlocks Auto-Bloom.",
                   currency: .stardust, maxLevel: 1, baseCost: 30, growth: 1),
        UpgradeDef(id: "s_autoterra", name: "Gaia Engine",     info: "Unlocks Auto-Terraform.",
                   currency: .stardust, maxLevel: 1, baseCost: 75, growth: 1)
    ]

    static func upgrade(_ id: String) -> UpgradeDef {
        return upgrades.first(where: { $0.id == id })!
    }

    func upgrades(for currency: Currency) -> [UpgradeDef] {
        return GameModel.upgrades.filter { $0.currency == currency }
    }

    // MARK: Convenience accessors

    func level(_ id: String) -> Int { upgradeLevels[id] ?? 0 }
    private func L(_ id: String) -> Double { Double(upgradeLevels[id] ?? 0) }
    func unlocked(_ id: String) -> Bool { (upgradeLevels[id] ?? 0) >= 1 }

    func amount(of c: Currency) -> Double {
        switch c {
        case .motes:    return motes
        case .pollen:   return pollen
        case .biomass:  return biomass
        case .stardust: return stardust
        }
    }
    private func spend(_ c: Currency, _ v: Double) {
        switch c {
        case .motes:    motes -= v
        case .pollen:   pollen -= v
        case .biomass:  biomass -= v
        case .stardust: stardust -= v
        }
    }

    var currentWorld: WorldDef { Worlds.world(for: worldIndex) }

    // MARK: Derived multipliers

    var effectiveSpeed: Double { difficulty.speed + 0.15 * L("s_speed") }

    var pollenMult: Double { 1.0 + pollen * (0.10 + 0.04 * L("p_pot")) }

    var biomassMult: Double { pow(1.6, L("b_mult")) * (1.0 + sqrt(max(0, biomass))) }

    var stardustMult: Double { pow(2.0, L("s_mult")) * (1.0 + stardust * 0.20) }

    var worldMult: Double {
        let worldStep = 1.0 + 0.6 * Double(worldIndex)
        let terraformer = 1.0 + 0.30 * L("b_world")
        return currentWorld.prodMult * worldStep * terraformer
    }

    /// The single multiplier applied to all passive production.
    var globalMult: Double {
        var m = effectiveSpeed
        m *= pollenMult
        m *= biomassMult
        m *= stardustMult
        m *= worldMult
        m *= pow(1.5, L("prod1")) * pow(2.0, L("p_prod"))
        return m
    }

    var tier0Mult: Double { pow(2.0, L("tier1")) }

    var clickValue: Double {
        let base = pow(2.0, L("tap1")) * pow(3.0, L("p_click"))
        return base * max(1.0, globalMult)
    }

    func effectiveCost(_ g: Generator) -> Double {
        let costReduce = pow(0.96, L("cost1"))
        let baseReduce = pow(0.85, L("b_cheap"))
        return g.rawCost * costReduce * baseReduce
    }

    /// Motes produced per second by Spores (the only generator feeding Motes directly).
    var motesPerSecond: Double {
        var v = generators[0].count * generators[0].baseProd * tier0Mult * globalMult
        if autoTap && unlocked("s_autotap") { v += clickValue }
        return v
    }

    var offlineCapSeconds: Double { 14_400.0 + L("b_off") * 7_200.0 }

    // MARK: Actions

    func tap() {
        let v = clickValue
        motes += v
        motesEarnedThisBloom += v
        totalTaps += 1
    }

    func buy(_ index: Int) {
        guard generators.indices.contains(index) else { return }
        let c = effectiveCost(generators[index])
        if motes >= c {
            motes -= c
            generators[index].count += 1
            generators[index].bought += 1
        }
    }

    /// Buy as many of a generator as currently affordable.
    func buyMax(_ index: Int) {
        guard generators.indices.contains(index) else { return }
        var bought = 0
        while bought < 5000 {
            let c = effectiveCost(generators[index])
            if motes >= c {
                motes -= c
                generators[index].count += 1
                generators[index].bought += 1
                bought += 1
            } else { break }
        }
    }

    func canBuyUpgrade(_ id: String) -> Bool {
        let def = GameModel.upgrade(id)
        let lvl = level(id)
        return lvl < def.maxLevel && amount(of: def.currency) >= def.cost(at: lvl)
    }

    func buyUpgrade(_ id: String) {
        let def = GameModel.upgrade(id)
        let lvl = level(id)
        guard lvl < def.maxLevel else { return }
        let c = def.cost(at: lvl)
        guard amount(of: def.currency) >= c else { return }
        spend(def.currency, c)
        upgradeLevels[id] = lvl + 1
    }

    // MARK: Reset layer 1 — Bloom

    var pollenGain: Double {
        let threshold = 1.0e6
        guard motesEarnedThisBloom >= threshold else { return 0 }
        return (sqrt(motesEarnedThisBloom / threshold)).rounded(.down)
    }
    var canBloom: Bool { pollenGain >= 1 }

    func bloom() {
        guard canBloom else { return }
        pollen += pollenGain
        blooms += 1
        resetMoteLayer()
    }

    /// Resets Motes, generators and Mote upgrades. Used by Bloom and the deeper resets.
    private func resetMoteLayer() {
        motes = 0
        motesEarnedThisBloom = 0
        generators = GameModel.defaultGenerators()
        for def in GameModel.upgrades where def.currency == .motes {
            upgradeLevels[def.id] = 0
        }
        // Head Start: free Spores carried in by the Pollen upgrade.
        let head = L("p_start")
        if head > 0 { generators[0].count = pow(10.0, head) }
    }

    // MARK: Reset layer 2 — Terraform (advance to a new world)

    var terraformReq: Double { 25.0 * pow(2.0, Double(worldIndex)) }
    var biomassGain: Double {
        guard pollen >= terraformReq else { return 0 }
        return max(1, pow(pollen, 0.6).rounded(.down))
    }
    var canTerraform: Bool { pollen >= terraformReq }

    func terraform() {
        guard canTerraform else { return }
        biomass += biomassGain
        terraforms += 1
        worldIndex += 1
        // Reset everything in the Mote + Pollen layers.
        pollen = 0
        for def in GameModel.upgrades where def.currency == .pollen {
            upgradeLevels[def.id] = 0
        }
        resetMoteLayer()
    }

    // MARK: Reset layer 3 — Singularity

    var singularityReq: Double { 60.0 }
    var stardustGain: Double {
        guard biomass >= singularityReq else { return 0 }
        return max(1, (pow(biomass, 0.4) + Double(worldIndex)).rounded(.down))
    }
    var canSingularity: Bool { biomass >= singularityReq }

    func singularity() {
        guard canSingularity else { return }
        stardust += stardustGain
        singularities += 1
        worldIndex = 0
        pollen = 0
        biomass = 0
        for def in GameModel.upgrades where def.currency == .pollen || def.currency == .biomass {
            upgradeLevels[def.id] = 0
        }
        resetMoteLayer()
        // Stellar Endowment: free Biomass to bootstrap the new cosmos.
        let endow = L("s_start")
        if endow > 0 { biomass = pow(5.0, endow) }
    }

    // MARK: Simulation

    /// Advance the simulation by `dt` seconds.
    func advance(_ dt: Double) {
        guard dt > 0 else { return }
        let m = globalMult

        // Each higher tier produces units of the tier directly below it.
        if generators.count >= 2 {
            for i in stride(from: generators.count - 1, through: 1, by: -1) {
                let add = generators[i].count * generators[i].baseProd * m * dt
                generators[i - 1].count = clampBig(generators[i - 1].count + add)
            }
        }
        // Spores (tier 0) produce Motes.
        let moteAdd = generators[0].count * generators[0].baseProd * tier0Mult * m * dt
        motes = clampBig(motes + moteAdd)
        motesEarnedThisBloom = clampBig(motesEarnedThisBloom + moteAdd)

        if autoTap && unlocked("s_autotap") {
            let t = clickValue * dt
            motes = clampBig(motes + t)
            motesEarnedThisBloom = clampBig(motesEarnedThisBloom + t)
        }
    }

    private func clampBig(_ v: Double) -> Double {
        if v.isNaN { return 0 }
        if v > 1e300 { return 1e300 }
        return v
    }

    /// The live game loop (called ~10×/sec).
    func tick() {
        let now = Date()
        var dt = now.timeIntervalSince(lastTick)
        lastTick = now
        if dt <= 0 { return }
        if dt > 1.0 { dt = 1.0 }   // clamp hitches; long gaps go through offline progress

        advance(dt)
        runAutomation()

        // Persist a few times a minute.
        if now.timeIntervalSince(lastSave) > 5 { save() }
    }

    private func runAutomation() {
        if autoBuyGens && unlocked("s_autogen") {
            // Buy a handful of the cheapest affordable generators each tick.
            for _ in 0..<3 {
                if let cheapest = (0..<generators.count).min(by: { effectiveCost(generators[$0]) < effectiveCost(generators[$1]) }) {
                    if motes >= effectiveCost(generators[cheapest]) { buy(cheapest) } else { break }
                }
            }
        }
        if autoTerraform && unlocked("s_autoterra") && canTerraform {
            terraform()
        } else if autoBloom && unlocked("s_autobloom") && pollenGain >= 5 {
            // Auto-Bloom only fires once it's meaningfully worthwhile.
            bloom()
        }
    }

    // MARK: Offline progress

    func applyOfflineProgress() {
        let now = Date()
        let dt = now.timeIntervalSince(lastSave)
        lastTick = now
        if dt < 5 { offlineMotes = 0; offlineSeconds = 0; return }
        let capped = min(dt, offlineCapSeconds)
        offlineSeconds = capped

        let motesBefore = motes
        // Simulate in coarse steps to capture tier cascading without freezing.
        let step = max(1.0, capped / 4000.0)
        var remaining = capped
        var iterations = 0
        while remaining > 0 && iterations < 6000 {
            advance(min(step, remaining))
            remaining -= step
            iterations += 1
        }
        let gained = motes - motesBefore
        offlineMotes = (gained.isNaN || gained < 0) ? 0 : gained
    }

    // MARK: Lifecycle

    func start() {
        guard timer == nil else { return }
        lastTick = Date()
        let t = Timer(timeInterval: 0.1, repeats: true) { [weak self] _ in
            self?.tick()
        }
        RunLoop.main.add(t, forMode: .common)
        timer = t
    }

    func stop() {
        timer?.invalidate()
        timer = nil
    }

    // MARK: Persistence

    private static let saveKey = "verdantvoid.save.v1"

    struct SaveData: Codable {
        var motes, pollen, biomass, stardust: Double
        var genCounts: [Double]
        var genBought: [Int]
        var upgradeLevels: [String: Int]
        var worldIndex: Int
        var difficulty: Difficulty
        var motesEarnedThisBloom: Double
        var totalTaps, blooms, terraforms, singularities: Int
        var autoTap, autoBuyGens, autoBloom, autoTerraform: Bool
        var hasChosenDifficulty: Bool
        var lastSave: Date
    }

    func save() {
        lastSave = Date()
        let data = SaveData(
            motes: motes, pollen: pollen, biomass: biomass, stardust: stardust,
            genCounts: generators.map { $0.count },
            genBought: generators.map { $0.bought },
            upgradeLevels: upgradeLevels,
            worldIndex: worldIndex,
            difficulty: difficulty,
            motesEarnedThisBloom: motesEarnedThisBloom,
            totalTaps: totalTaps, blooms: blooms, terraforms: terraforms, singularities: singularities,
            autoTap: autoTap, autoBuyGens: autoBuyGens, autoBloom: autoBloom, autoTerraform: autoTerraform,
            hasChosenDifficulty: hasChosenDifficulty,
            lastSave: lastSave
        )
        if let encoded = try? JSONEncoder().encode(data) {
            UserDefaults.standard.set(encoded, forKey: GameModel.saveKey)
        }
    }

    func load() {
        guard let raw = UserDefaults.standard.data(forKey: GameModel.saveKey),
              let s = try? JSONDecoder().decode(SaveData.self, from: raw) else { return }
        motes = s.motes; pollen = s.pollen; biomass = s.biomass; stardust = s.stardust
        generators = GameModel.defaultGenerators()
        for i in generators.indices {
            if i < s.genCounts.count { generators[i].count = s.genCounts[i] }
            if i < s.genBought.count { generators[i].bought = s.genBought[i] }
        }
        upgradeLevels = s.upgradeLevels
        worldIndex = s.worldIndex
        difficulty = s.difficulty
        motesEarnedThisBloom = s.motesEarnedThisBloom
        totalTaps = s.totalTaps; blooms = s.blooms; terraforms = s.terraforms; singularities = s.singularities
        autoTap = s.autoTap; autoBuyGens = s.autoBuyGens; autoBloom = s.autoBloom; autoTerraform = s.autoTerraform
        hasChosenDifficulty = s.hasChosenDifficulty
        lastSave = s.lastSave
    }

    /// Wipe everything and start over (used from Settings).
    func hardReset() {
        motes = 0; pollen = 0; biomass = 0; stardust = 0
        generators = GameModel.defaultGenerators()
        upgradeLevels = [:]
        worldIndex = 0
        motesEarnedThisBloom = 0
        totalTaps = 0; blooms = 0; terraforms = 0; singularities = 0
        autoTap = false; autoBuyGens = false; autoBloom = false; autoTerraform = false
        hasChosenDifficulty = false
        offlineMotes = 0; offlineSeconds = 0
        lastSave = Date(); lastTick = Date()
        UserDefaults.standard.removeObject(forKey: GameModel.saveKey)
    }
}
