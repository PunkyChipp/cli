import SwiftUI
import Observation

// MARK: - Difficulty

enum Difficulty: String, CaseIterable, Codable, Identifiable {
    case relaxed, diver, abyssal
    var id: String { rawValue }
    var speed: Double {
        switch self {
        case .relaxed: return 1.6
        case .diver:   return 1.0
        case .abyssal: return 0.65
        }
    }
    var label: String {
        switch self {
        case .relaxed: return "Relaxed"
        case .diver:   return "Diver"
        case .abyssal: return "Abyssal"
        }
    }
    var blurb: String {
        switch self {
        case .relaxed: return "A gentle current. Everything flows a little faster."
        case .diver:   return "The intended descent. A long, rewarding dive."
        case .abyssal: return "Slow and heavy. Every Pearl counts. For veterans."
        }
    }
    var glyph: String {
        switch self {
        case .relaxed: return "tortoise.fill"
        case .diver:   return "figure.pool.swim"
        case .abyssal: return "drop.degreesign.fill"
        }
    }
}

// MARK: - Capped, mixed Pearl upgrades (World 1)

struct PearlUpgrade: Identifiable {
    let id: String
    let name: String
    let info: String
    let base: Double
    let growth: Double
    let cap: Int
    func cost(at level: Int) -> Double { base * pow(growth, Double(level)) }
}

// MARK: - Tide milestones (the interlock's reward spine)

struct Milestone: Identifiable {
    let id: Int          // tide level required
    let title: String
    let detail: String
}

// MARK: - Game model

@Observable
final class GameModel {

    // --- Global / cross-world ---
    var zone: Int = 0            // 0 = Sunlit Shallows, 1 = Twilight Reach …
    var maxZone: Int = 0
    var pressure: Int = 0        // earned per Descent; a permanent global multiplier
    var difficulty: Difficulty = .diver
    var hasChosenDifficulty = false

    // --- World 1: Sunlit Shallows ---
    var lumens: Double = 0
    var planktonOwned: Int = 0
    var pearls: Double = 0
    var tide: Int = 0
    var maxTide: Int = 0
    var pearlUp: [String: Int] = [:]

    // --- World 2: Twilight Reach (teaser ecosystem) ---
    var glow: Double = 0
    var lanternOwned: Int = 0
    var lure: Int = 0
    var maxLure: Int = 0

    // --- Automation ---
    var autoTap = false
    var autoPlankton = false
    var autoEbb = false
    var autoEbbTarget: Int = 5      // auto-ebb once a reset would yield this many Pearls
    var autoPulse = false
    var autoLantern = false

    // --- Run stats ---
    var lumensThisEbb: Double = 0
    var totalTaps: Int = 0
    var ebbs: Int = 0
    var descents: Int = 0

    // --- Transient (not saved) ---
    var pendingDescent: Int? = nil
    var pendingUnlocks: [String] = []
    var seenUnlocks: Set<String> = []
    var offlineGain: Double = 0
    var offlineSeconds: Double = 0

    var lastSave = Date()
    var lastTick = Date()
    private var timer: Timer?

    init() { load() }

    // MARK: Content

    static let pearlUpgrades: [PearlUpgrade] = [
        PearlUpgrade(id: "brine",    name: "Brine Strength",   info: "+2 base harvest per tap.",                 base: 4,  growth: 1.5,  cap: 25),
        PearlUpgrade(id: "shoal",    name: "Rich Shoals",      info: "Plankton yield ×1.12 each level.",          base: 6,  growth: 1.6,  cap: 20),
        PearlUpgrade(id: "sunwell",  name: "Sunwell",          info: "All Lumens ×1.10 each level.",              base: 10, growth: 1.7,  cap: 20),
        PearlUpgrade(id: "undertow", name: "Undertow",         info: "Tide cost ×0.97 each level (cheaper).",     base: 8,  growth: 1.65, cap: 20),
        PearlUpgrade(id: "spawn",    name: "Spawning Grounds",  info: "Start each Ebb with +3 Plankton.",          base: 12, growth: 1.7,  cap: 15),
        PearlUpgrade(id: "mother",   name: "Mother-of-Pearl",  info: "+8% Pearls from every Ebb.",                base: 15, growth: 1.8,  cap: 15),
        PearlUpgrade(id: "diver",    name: "Pearl Diver",      info: "Unlocks Auto-Ebb in Automation.",           base: 120, growth: 1,   cap: 1)
    ]
    static func pearlDef(_ id: String) -> PearlUpgrade { pearlUpgrades.first { $0.id == id }! }

    static let milestones: [Milestone] = [
        Milestone(id: 5,  title: "Steady Hands",   detail: "Unlocks Auto-Harvest."),
        Milestone(id: 10, title: "Living Current", detail: "Plankton now make the Tide cheaper to raise."),
        Milestone(id: 15, title: "Self-Seeding",   detail: "Unlocks Auto-Plankton."),
        Milestone(id: 20, title: "Sunbloom",       detail: "Plankton yield ×1.5, and Plankton now boost your tap."),
        Milestone(id: 30, title: "High Tide",      detail: "All Lumens ×2."),
        Milestone(id: 40, title: "The Drop-Off",   detail: "You can Descend to the Twilight Reach.")
    ]

    func level(_ id: String) -> Int { pearlUp[id] ?? 0 }
    func hasMilestone(_ t: Int) -> Bool { maxTide >= t }

    var currentZone: ZoneDef { Zones.zone(zone) }

    // MARK: Global multiplier

    var pressureMult: Double { pow(2.0, Double(pressure)) }
    var sunwellMult: Double { pow(1.10, Double(level("sunwell"))) }
    var globalLumenMult: Double {
        difficulty.speed * pressureMult * sunwellMult * (hasMilestone(30) ? 2.0 : 1.0)
    }

    // MARK: World 1 — derived

    /// Tide multiplies tap and plankton — the spine the whole world feeds.
    var tideTapMult: Double { 1.0 + 0.08 * Double(tide) }
    var tidePlanktonMult: Double { 1.0 + 0.06 * Double(tide) }

    var shoalMult: Double { pow(1.12, Double(level("shoal"))) }

    /// Cross-boost: holding Plankton makes the Tide cheaper (unlocked at milestone 10).
    var planktonTideDiscount: Double {
        guard hasMilestone(10) else { return 1.0 }
        return max(0.40, 1.0 - 0.02 * sqrt(Double(planktonOwned)))
    }
    /// Cross-boost: Plankton boost your tap (unlocked at milestone 20).
    var planktonTapBonus: Double {
        guard hasMilestone(20) else { return 1.0 }
        return 1.0 + 0.02 * sqrt(Double(planktonOwned))
    }

    var planktonYield: Double {
        0.5 * tidePlanktonMult * shoalMult * (hasMilestone(20) ? 1.5 : 1.0)
    }
    var lumensPerSecond: Double { Double(planktonOwned) * planktonYield * globalLumenMult }

    var tapValue: Double {
        let flat = 1.0 + 2.0 * Double(level("brine"))
        return flat * tideTapMult * planktonTapBonus * pressureMult * sunwellMult
    }

    var planktonCost: Double { 8.0 * pow(1.13, Double(planktonOwned)) }
    var tideCost: Double {
        12.0 * pow(1.32, Double(tide)) * pow(0.97, Double(level("undertow"))) * planktonTideDiscount
    }

    var startingPlankton: Int { 3 * level("spawn") }

    // MARK: World 1 — Ebb (fast repeatable reset)

    var pearlGain: Double {
        let g = sqrt(lumensThisEbb / 500.0) * (1.0 + 0.08 * Double(level("mother")))
        return g.rounded(.down)
    }
    var canEbb: Bool { pearlGain >= 1 }

    func ebb() {
        guard canEbb else { return }
        pearls += pearlGain
        ebbs += 1
        lumens = 0
        lumensThisEbb = 0
        tide = 0
        planktonOwned = startingPlankton
    }

    // MARK: World 1 — actions

    func tap() {
        guard zone == 0 else { pulse(); return }
        let v = tapValue
        lumens += v
        lumensThisEbb += v
        totalTaps += 1
    }

    func buyPlankton(_ n: Int = 1) {
        for _ in 0..<n {
            let c = planktonCost
            guard lumens >= c else { return }
            lumens -= c
            planktonOwned += 1
        }
    }
    func buyMaxPlankton() {
        var guardCount = 0
        while lumens >= planktonCost && guardCount < 2000 { buyPlankton(); guardCount += 1 }
    }
    func raiseTide() {
        let c = tideCost
        guard lumens >= c else { return }
        lumens -= c
        tide += 1
        maxTide = max(maxTide, tide)
    }

    func buyPearl(_ id: String) {
        let def = GameModel.pearlDef(id)
        let lvl = level(id)
        guard lvl < def.cap, pearls >= def.cost(at: lvl) else { return }
        pearls -= def.cost(at: lvl)
        pearlUp[id] = lvl + 1
    }
    func canBuyPearl(_ id: String) -> Bool {
        let def = GameModel.pearlDef(id)
        let lvl = level(id)
        return lvl < def.cap && pearls >= def.cost(at: lvl)
    }

    // MARK: Descent

    var descentReq: Double { 60 }
    var descentAvailable: Bool { zone == 0 && hasMilestone(40) && pearls >= descentReq }

    func descend() {
        guard descentAvailable else { return }
        pressure += 1
        descents += 1
        zone = 1
        maxZone = max(maxZone, 1)
        pendingDescent = 1
    }

    // MARK: World 2 — Twilight (teaser ecosystem)

    var lureMult: Double { 1.0 + 0.07 * Double(lure) }
    var lanternYield: Double { 0.8 * lureMult }
    var glowPerSecond: Double { Double(lanternOwned) * lanternYield * difficulty.speed * pressureMult }
    var pulseValue: Double { (1.0 + 0.6 * Double(lure)) * pressureMult }
    var lanternCost: Double { 20.0 * pow(1.18, Double(lanternOwned)) }
    var lanternTideDiscount: Double { max(0.5, 1.0 - 0.02 * sqrt(Double(lanternOwned))) }
    var lureCost: Double { 25.0 * pow(1.4, Double(lure)) * lanternTideDiscount }

    func pulse() {
        glow += pulseValue
        totalTaps += 1
    }
    func buyLantern(_ n: Int = 1) {
        for _ in 0..<n {
            let c = lanternCost
            guard glow >= c else { return }
            glow -= c
            lanternOwned += 1
        }
    }
    func raiseLure() {
        let c = lureCost
        guard glow >= c else { return }
        glow -= c
        lure += 1
        maxLure = max(maxLure, lure)
    }

    // MARK: Simulation

    func advance(_ dt: Double) {
        guard dt > 0 else { return }
        if zone == 0 {
            let add = lumensPerSecond * dt
            lumens = clampBig(lumens + add)
            lumensThisEbb = clampBig(lumensThisEbb + add)
            if autoTap && hasMilestone(5) {
                let t = tapValue * dt
                lumens = clampBig(lumens + t); lumensThisEbb = clampBig(lumensThisEbb + t)
            }
        } else {
            glow = clampBig(glow + glowPerSecond * dt)
            if autoPulse && maxLure >= 5 { glow = clampBig(glow + pulseValue * dt) }
        }
    }

    private func clampBig(_ v: Double) -> Double {
        if v.isNaN { return 0 }
        return min(v, 1e300)
    }

    private func runAutomation() {
        if zone == 0 {
            if autoPlankton && hasMilestone(15) { buyPlankton(6) }
            if autoEbb && level("diver") >= 1 && pearlGain >= Double(autoEbbTarget) { ebb() }
        } else {
            if autoLantern { buyLantern(6) }
        }
    }

    private func checkUnlocks() {
        func fire(_ id: String, _ cond: Bool) {
            if cond && !seenUnlocks.contains(id) { seenUnlocks.insert(id); pendingUnlocks.append(id) }
        }
        fire("ebb", canEbb)
        fire("tide", lumens >= 12 || tide > 0)
        fire("milestone5", hasMilestone(5))
        fire("descent", descentAvailable)
    }

    func tick() {
        let now = Date()
        var dt = now.timeIntervalSince(lastTick)
        lastTick = now
        if dt <= 0 { return }
        if dt > 1.0 { dt = 1.0 }
        advance(dt)
        runAutomation()
        checkUnlocks()
        if now.timeIntervalSince(lastSave) > 5 { save() }
    }

    // MARK: Offline

    func applyOfflineProgress() {
        let now = Date()
        let dt = now.timeIntervalSince(lastSave)
        lastTick = now
        guard dt > 30 else { offlineGain = 0; offlineSeconds = 0; return }
        let capped = min(dt, 8 * 3600)
        offlineSeconds = capped
        if zone == 0 {
            let g = lumensPerSecond * capped
            lumens = clampBig(lumens + g); lumensThisEbb = clampBig(lumensThisEbb + g)
            offlineGain = g
        } else {
            let g = glowPerSecond * capped
            glow = clampBig(glow + g); offlineGain = g
        }
    }

    // MARK: Lifecycle

    func start() {
        guard timer == nil else { return }
        lastTick = Date()
        let t = Timer(timeInterval: 0.1, repeats: true) { [weak self] _ in self?.tick() }
        RunLoop.main.add(t, forMode: .common)
        timer = t
    }
    func stop() { timer?.invalidate(); timer = nil }

    // MARK: Persistence

    private static let saveKey = "abyss.save.v1"

    struct SaveData: Codable {
        var zone = 0, maxZone = 0, pressure = 0
        var difficulty: Difficulty = .diver
        var hasChosenDifficulty = false
        var lumens = 0.0, pearls = 0.0
        var planktonOwned = 0, tide = 0, maxTide = 0
        var pearlUp: [String: Int] = [:]
        var glow = 0.0, lanternOwned = 0, lure = 0, maxLure = 0
        var autoTap = false, autoPlankton = false, autoEbb = false, autoEbbTarget = 5
        var autoPulse = false, autoLantern = false
        var lumensThisEbb = 0.0
        var totalTaps = 0, ebbs = 0, descents = 0
        var seenUnlocks: [String] = []
        var lastSave = Date()
    }

    func save() {
        lastSave = Date()
        let d = SaveData(zone: zone, maxZone: maxZone, pressure: pressure,
                         difficulty: difficulty, hasChosenDifficulty: hasChosenDifficulty,
                         lumens: lumens, pearls: pearls,
                         planktonOwned: planktonOwned, tide: tide, maxTide: maxTide,
                         pearlUp: pearlUp,
                         glow: glow, lanternOwned: lanternOwned, lure: lure, maxLure: maxLure,
                         autoTap: autoTap, autoPlankton: autoPlankton, autoEbb: autoEbb, autoEbbTarget: autoEbbTarget,
                         autoPulse: autoPulse, autoLantern: autoLantern,
                         lumensThisEbb: lumensThisEbb,
                         totalTaps: totalTaps, ebbs: ebbs, descents: descents,
                         seenUnlocks: Array(seenUnlocks), lastSave: lastSave)
        if let e = try? JSONEncoder().encode(d) { UserDefaults.standard.set(e, forKey: GameModel.saveKey) }
    }

    func load() {
        guard let raw = UserDefaults.standard.data(forKey: GameModel.saveKey),
              let s = try? JSONDecoder().decode(SaveData.self, from: raw) else { return }
        zone = s.zone; maxZone = s.maxZone; pressure = s.pressure
        difficulty = s.difficulty; hasChosenDifficulty = s.hasChosenDifficulty
        lumens = s.lumens; pearls = s.pearls
        planktonOwned = s.planktonOwned; tide = s.tide; maxTide = s.maxTide
        pearlUp = s.pearlUp
        glow = s.glow; lanternOwned = s.lanternOwned; lure = s.lure; maxLure = s.maxLure
        autoTap = s.autoTap; autoPlankton = s.autoPlankton; autoEbb = s.autoEbb; autoEbbTarget = s.autoEbbTarget
        autoPulse = s.autoPulse; autoLantern = s.autoLantern
        lumensThisEbb = s.lumensThisEbb
        totalTaps = s.totalTaps; ebbs = s.ebbs; descents = s.descents
        seenUnlocks = Set(s.seenUnlocks)
        lastSave = s.lastSave; lastTick = Date()
    }

    func hardReset() {
        zone = 0; maxZone = 0; pressure = 0
        lumens = 0; pearls = 0; planktonOwned = 0; tide = 0; maxTide = 0; pearlUp = [:]
        glow = 0; lanternOwned = 0; lure = 0; maxLure = 0
        autoTap = false; autoPlankton = false; autoEbb = false; autoEbbTarget = 5
        autoPulse = false; autoLantern = false
        lumensThisEbb = 0; totalTaps = 0; ebbs = 0; descents = 0
        seenUnlocks = []; pendingUnlocks = []; pendingDescent = nil
        offlineGain = 0; offlineSeconds = 0
        hasChosenDifficulty = false
        lastSave = Date(); lastTick = Date()
        UserDefaults.standard.removeObject(forKey: GameModel.saveKey)
    }
}
