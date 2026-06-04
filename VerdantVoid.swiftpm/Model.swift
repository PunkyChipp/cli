import SwiftUI
import Observation

// MARK: - Difficulty

enum Difficulty: String, CaseIterable, Codable, Identifiable {
    case easy, medium, hard
    var id: String { rawValue }

    /// Global speed multiplier applied to all production. Faster = easier.
    var speed: Double {
        switch self {
        case .easy:   return 2.5
        case .medium: return 1.0
        case .hard:   return 0.5
        }
    }
    /// A flat head-start multiplier on early production, biggest on Easy. Decays
    /// as the run matures so it never trivialises the late game.
    var earlyBoost: Double {
        switch self {
        case .easy:   return 1.6
        case .medium: return 1.0
        case .hard:   return 0.8
        }
    }
    var label: String { rawValue.capitalized }
    var blurb: String {
        switch self {
        case .easy:   return "2.5× speed and a head start. A relaxed climb — great for a first run."
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
    case motes, pollen, biomass, sap, stardust
    var id: String { rawValue }
    var name: String {
        switch self {
        case .motes:    return "Motes"
        case .pollen:   return "Pollen"
        case .biomass:  return "Biomass"
        case .sap:      return "Sap"
        case .stardust: return "Stardust"
        }
    }
    var glyph: String {
        switch self {
        case .motes:    return "sparkle"
        case .pollen:   return "circle.grid.cross.fill"
        case .biomass:  return "leaf.circle.fill"
        case .sap:      return "drop.fill"
        case .stardust: return "star.fill"
        }
    }
    var color: Color {
        switch self {
        case .motes:    return Color(hex: 0x9be7a6)
        case .pollen:   return Color(hex: 0xffe27a)
        case .biomass:  return Color(hex: 0x7ad6a0)
        case .sap:      return Color(hex: 0xc9ff6b)
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
    var sap: Double = 0
    var stardust: Double = 0

    // --- Generators & upgrades ---
    var generators: [Generator] = GameModel.defaultGenerators()
    var upgradeLevels: [String: Int] = [:]

    // --- The Root Web (cell index 0..<rootBoardCount -> node kind) ---
    var rootNodes: [Int: RootNodeKind] = [:]

    // --- The Long Year (season cycle, 0..<1) ---
    var yearPhase: Double = 0

    // --- Field Journal (ids of discoveries made) ---
    var discovered: Set<String> = []
    /// Transient queue of just-unlocked discoveries, for the toast. Not saved.
    var newlyDiscovered: [String] = []
    /// The discovery currently shown in the toast, and when it appeared. Driven by
    /// the game tick (not by view lifecycle) so the banner can never get stuck.
    var activeToast: String? = nil
    var toastShownAt: Date = .distantPast

    // --- Collection cards (unlocked at the first Singularity) ---
    var ownedCards: Set<String> = []
    var equippedCards: [String] = []
    var packsPulled: Int = 0

    // --- System-unlock celebration events (gradual onboarding) ---
    var pendingUnlocks: [String] = []
    var seenUnlocks: Set<String> = []
    /// A full-screen world-arrival transition is requested for this world index.
    var pendingWorldArrival: Int? = nil

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
            Generator(id: 0, name: "Spore",   glyph: "circle.hexagongrid.fill", baseCost: 10,    costGrowth: 1.10,  baseProd: 1.0),
            Generator(id: 1, name: "Sprout",  glyph: "leaf.fill",               baseCost: 110,   costGrowth: 1.12,  baseProd: 0.25),
            Generator(id: 2, name: "Shrub",   glyph: "camera.macro",            baseCost: 1.3e3, costGrowth: 1.13,  baseProd: 0.18),
            Generator(id: 3, name: "Tree",    glyph: "tree.fill",               baseCost: 1.7e4, costGrowth: 1.145, baseProd: 0.14),
            Generator(id: 4, name: "Grove",   glyph: "leaf.circle.fill",        baseCost: 3.0e5, costGrowth: 1.16,  baseProd: 0.11),
            Generator(id: 5, name: "Ancient", glyph: "laurel.leading",          baseCost: 7.0e6, costGrowth: 1.175, baseProd: 0.09)
        ]
    }

    static let upgrades: [UpgradeDef] = [
        // --- Mote upgrades (reset every Bloom) ---
        UpgradeDef(id: "tap1",  name: "Sharper Touch", info: "Doubles the Motes gained per tap.",
                   currency: .motes, maxLevel: 25, baseCost: 30, growth: 3.0),
        UpgradeDef(id: "prod1", name: "Fertile Soil",  info: "All production ×1.5 — and every 10 levels the bonus itself grows stronger.",
                   currency: .motes, maxLevel: 30, baseCost: 220, growth: 4.4),
        UpgradeDef(id: "tier1", name: "Spore Surge",   info: "Spore output ×2.",
                   currency: .motes, maxLevel: 15, baseCost: 600, growth: 5.5),
        UpgradeDef(id: "m_syn", name: "Mycorrhizal Net", info: "Production rises with the number of distinct lifeforms you own (+15% each, per level).",
                   currency: .motes, maxLevel: 10, baseCost: 1.5e3, growth: 4.0),
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
                   currency: .stardust, maxLevel: 1, baseCost: 75, growth: 1),

        // --- Sap upgrades (spent in the Root Web; persist until a Singularity) ---
        UpgradeDef(id: "sap_budget", name: "Deep Aquifer",   info: "+3 to your Water budget. Room for thirstier webs.",
                   currency: .sap, maxLevel: 25, baseCost: 18, growth: 1.55),
        UpgradeDef(id: "sap_out",    name: "Rich Loam",      info: "Root Web output ×1.25.",
                   currency: .sap, maxLevel: 25, baseCost: 30, growth: 1.7),
        UpgradeDef(id: "sap_rate",   name: "Living Sapwells", info: "All Sap gain ×1.3.",
                   currency: .sap, maxLevel: 20, baseCost: 25, growth: 1.65)
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
        case .sap:      return sap
        case .stardust: return stardust
        }
    }
    private func spend(_ c: Currency, _ v: Double) {
        switch c {
        case .motes:    motes -= v
        case .pollen:   pollen -= v
        case .biomass:  biomass -= v
        case .sap:      sap -= v
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

    /// How many distinct lifeforms (generators) you currently own at least one of.
    var distinctLifeforms: Int { generators.filter { $0.count >= 1 }.count }

    /// Mycorrhizal Net: production scales with build breadth.
    var synergyMult: Double { 1.0 + 0.15 * L("m_syn") * Double(distinctLifeforms) }

    /// Fertile Soil, compounding: the per-level effect itself steps up every 10 levels (GCI-style).
    var fertileSoilMult: Double {
        let lvl = L("prod1")
        let perLevel = 0.5 * (1.0 + 0.5 * floor(lvl / 10.0))
        return pow(1.0 + perLevel, lvl)
    }

    /// A decaying head-start so Easy feels snappy without breaking the late game.
    /// Full strength until the first Bloom, then fades over the next few worlds.
    var earlyBoostMult: Double {
        let decay = pow(0.6, Double(blooms) + Double(worldIndex) * 0.5)
        return 1.0 + (difficulty.earlyBoost - 1.0) * decay
    }

    /// Every 25 *purchased* of a single lifeform doubles that lifeform's output
    /// (GCI milestones). Based on `bought` (not `count`, which auto-inflates) and
    /// capped so it can never overflow to infinity.
    func milestoneMult(_ bought: Int) -> Double { pow(2.0, min(floor(Double(bought) / 25.0), 40)) }
    /// Purchases remaining until this lifeform's next milestone.
    func nextMilestone(_ bought: Int) -> Int { (bought / 25 + 1) * 25 }

    /// The single multiplier applied to all passive production.
    var globalMult: Double {
        var m = effectiveSpeed
        m *= pollenMult
        m *= biomassMult
        m *= stardustMult
        m *= worldMult
        m *= fertileSoilMult * pow(2.0, L("p_prod"))
        m *= synergyMult       // Mycorrhizal Net (build-breadth synergy)
        m *= earlyBoostMult    // Difficulty head-start (decays)
        m *= rootWebMult       // The Root Web (spatial puzzle layer)
        m *= cardMult          // Equipped collection cards
        m *= journalMult       // Field Journal discoveries
        m *= seasonProdMult    // Day-phase photosynthesis bonus
        return m
    }

    var tier0Mult: Double { pow(2.0, L("tier1")) }

    var clickValue: Double {
        let base = pow(2.0, L("tap1")) * pow(3.0, L("p_click"))
        return base * max(1.0, globalMult) * seasonTapMult * cardTapMult
    }

    func effectiveCost(_ g: Generator) -> Double {
        let costReduce = pow(0.96, L("cost1"))
        let baseReduce = pow(0.85, L("b_cheap"))
        return g.rawCost * costReduce * baseReduce * cardCostMult
    }

    /// Motes produced per second by Spores (the only generator feeding Motes directly).
    var motesPerSecond: Double {
        var v = generators[0].count * generators[0].baseProd * milestoneMult(generators[0].bought) * tier0Mult * globalMult
        if autoTap && unlocked("s_autotap") { v += clickValue }
        return v
    }

    var offlineCapSeconds: Double { 14_400.0 + L("b_off") * 7_200.0 + cardOfflineBonus }

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
        return (sqrt(motesEarnedThisBloom / threshold) * seasonBloomMult).rounded(.down)
    }
    var canBloom: Bool { pollenGain >= 1 }

    func bloom() {
        guard canBloom else { return }
        pollen += pollenGain
        blooms += 1
        // Seed Sap so the Root Web is reachable from the very first Bloom.
        sap += (5.0 + 2.0 * Double(blooms)) * seasonSapMult
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
        pendingWorldArrival = worldIndex   // trigger the arrival "journey" transition
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
        // +singularities is a floor term (EUT): every collapse out-earns the last.
        return max(1, (pow(biomass, 0.4) + Double(worldIndex) + Double(singularities)).rounded(.down))
    }
    var canSingularity: Bool { biomass >= singularityReq }

    func singularity() {
        guard canSingularity else { return }
        stardust += stardustGain
        singularities += 1
        worldIndex = 0
        pendingWorldArrival = 0
        pollen = 0
        biomass = 0
        for def in GameModel.upgrades where def.currency == .pollen || def.currency == .biomass || def.currency == .sap {
            upgradeLevels[def.id] = 0
        }
        resetMoteLayer()
        // The Root Web is part of the cosmos and collapses with it.
        rootNodes = [:]
        sap = 0
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
                let add = generators[i].count * generators[i].baseProd * milestoneMult(generators[i].bought) * m * dt
                generators[i - 1].count = clampBig(generators[i - 1].count + add)
            }
        }
        // Spores (tier 0) produce Motes.
        let moteAdd = generators[0].count * generators[0].baseProd * milestoneMult(generators[0].bought) * tier0Mult * m * dt
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
        advanceSeason(dt)
        accrueSap(dt)
        runAutomation()
        checkDiscoveries()
        checkUnlocks()
        updateToast(now)

        // Persist a few times a minute.
        if now.timeIntervalSince(lastSave) > 5 { save() }
    }

    /// Advances the discovery toast on the game clock: shows the next queued
    /// discovery and retires it after a few seconds. Immune to view-lifecycle bugs.
    private func updateToast(_ now: Date) {
        if activeToast != nil, now.timeIntervalSince(toastShownAt) >= 2.8 {
            activeToast = nil
        }
        if activeToast == nil, !newlyDiscovered.isEmpty {
            activeToast = newlyDiscovered.removeFirst()
            toastShownAt = now
        }
    }

    /// Detects the first time each major system becomes available and queues a
    /// one-shot celebratory banner (gradual onboarding).
    private func checkUnlocks() {
        func fire(_ id: String, _ condition: Bool) {
            if condition && !seenUnlocks.contains(id) {
                seenUnlocks.insert(id)
                pendingUnlocks.append(id)
            }
        }
        fire("ascend", canBloom)
        fire("roots", rootWebUnlocked)
        fire("terraform", canTerraform)
        fire("cosmos", singularities >= 1 || stardust > 0)
        fire("cards", cardsUnlocked)
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
        var sap: Double = 0
        var genCounts: [Double]
        var genBought: [Int]
        var upgradeLevels: [String: Int]
        var rootCells: [Int] = []
        var rootKinds: [String] = []
        var yearPhase: Double = 0
        var discovered: [String] = []
        var ownedCards: [String] = []
        var equippedCards: [String] = []
        var packsPulled: Int = 0
        var seenUnlocks: [String] = []
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
        let cells = Array(rootNodes.keys)
        let kinds = cells.map { rootNodes[$0]!.rawValue }
        let data = SaveData(
            motes: motes, pollen: pollen, biomass: biomass, stardust: stardust,
            sap: sap,
            genCounts: generators.map { $0.count },
            genBought: generators.map { $0.bought },
            upgradeLevels: upgradeLevels,
            rootCells: cells,
            rootKinds: kinds,
            yearPhase: yearPhase,
            discovered: Array(discovered),
            ownedCards: Array(ownedCards),
            equippedCards: equippedCards,
            packsPulled: packsPulled,
            seenUnlocks: Array(seenUnlocks),
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
        sap = s.sap
        generators = GameModel.defaultGenerators()
        for i in generators.indices {
            if i < s.genCounts.count { generators[i].count = s.genCounts[i] }
            if i < s.genBought.count { generators[i].bought = s.genBought[i] }
        }
        upgradeLevels = s.upgradeLevels
        rootNodes = [:]
        for (i, cell) in s.rootCells.enumerated() where i < s.rootKinds.count {
            if let kind = RootNodeKind(rawValue: s.rootKinds[i]) { rootNodes[cell] = kind }
        }
        yearPhase = s.yearPhase
        discovered = Set(s.discovered)
        ownedCards = Set(s.ownedCards)
        equippedCards = s.equippedCards.filter { ownedCards.contains($0) }
        packsPulled = s.packsPulled
        seenUnlocks = Set(s.seenUnlocks)
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
        motes = 0; pollen = 0; biomass = 0; stardust = 0; sap = 0
        generators = GameModel.defaultGenerators()
        upgradeLevels = [:]
        rootNodes = [:]
        yearPhase = 0
        discovered = []
        newlyDiscovered = []
        activeToast = nil
        ownedCards = []
        equippedCards = []
        packsPulled = 0
        seenUnlocks = []
        pendingUnlocks = []
        pendingWorldArrival = nil
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
