import SwiftUI

/// The Long Year: a continuous Dawn → Day → Dusk → Night cycle that changes
/// which action pays best, and visibly reskins the sky. It runs on game time so
/// each phase has a clear "do this now" pull.
extension GameModel {

    var yearCycleLength: Double { 600 } // 10 minutes per full year

    func advanceSeason(_ dt: Double) {
        yearPhase += dt / yearCycleLength
        if yearPhase >= 1 { yearPhase -= floor(yearPhase) }
        if yearPhase < 0 { yearPhase = 0 }
    }

    func accrueSap(_ dt: Double) {
        guard rootWebUnlocked else { return }
        sap = min(1e300, sap + sapPerSecond * dt)
    }

    var seasonIndex: Int { min(3, max(0, Int(yearPhase * 4))) }

    var seasonName: String {
        switch seasonIndex {
        case 0: return "Dawn"; case 1: return "Day"; case 2: return "Dusk"; default: return "Night"
        }
    }
    var seasonGlyph: String {
        switch seasonIndex {
        case 0: return "sunrise.fill"; case 1: return "sun.max.fill"; case 2: return "sunset.fill"; default: return "moon.stars.fill"
        }
    }
    var seasonBlurb: String {
        switch seasonIndex {
        case 0: return "Tapping is supercharged (×2)."
        case 1: return "Photosynthesis: all production ×1.6."
        case 2: return "Sap flows: Root Web yields ×2 Sap."
        default: return "Long shadows: Bloom gives ×1.6 Pollen."
        }
    }
    var seasonColor: Color {
        switch seasonIndex {
        case 0: return Color(hex: 0xffb27a); case 1: return Color(hex: 0xffe27a)
        case 2: return Color(hex: 0xff8ad0); default: return Color(hex: 0x9aa6ff)
        }
    }

    /// Progress 0…1 through the current season, and time remaining in it.
    var seasonProgress: Double { (yearPhase * 4).truncatingRemainder(dividingBy: 1) }
    var seasonTimeRemaining: Double { (1 - seasonProgress) * (yearCycleLength / 4) }

    var seasonProdMult: Double { seasonIndex == 1 ? 1.6 : 1.0 }
    var seasonTapMult: Double { seasonIndex == 0 ? 2.0 : 1.0 }
    var seasonSapMult: Double { seasonIndex == 2 ? 2.0 : 1.0 }
    var seasonBloomMult: Double { seasonIndex == 3 ? 1.6 : 1.0 }
}
