import SwiftUI

// MARK: - Root Web board

/// 5×5 lattice the player grows beneath the world.
let rootBoardCols = 5
let rootBoardCount = 25

/// The kinds of node you can plant. The puzzle: every node draws **Water**, and
/// if total draw exceeds your **Water budget** the whole web *wilts* (output
/// scales down). Nodules raise the budget; Conduits boost neighbours; Prisms copy
/// a neighbour; clusters pay off — so where you place things matters as much as
/// what you place.
enum RootNodeKind: String, CaseIterable, Identifiable {
    case taproot, nodule, conduit, bloomcap, prism, sporangium, heartwood
    var id: String { rawValue }

    var name: String {
        switch self {
        case .taproot:    return "Taproot"
        case .nodule:     return "Nodule"
        case .conduit:    return "Conduit"
        case .bloomcap:   return "Bloomcap"
        case .prism:      return "Prism"
        case .sporangium: return "Sporangium"
        case .heartwood:  return "Heartwood"
        }
    }
    var glyph: String {
        switch self {
        case .taproot:    return "leaf.fill"
        case .nodule:     return "drop.circle.fill"
        case .conduit:    return "link"
        case .bloomcap:   return "camera.macro"
        case .prism:      return "triangle.fill"
        case .sporangium: return "humidity.fill"
        case .heartwood:  return "tree.fill"
        }
    }
    var color: Color {
        switch self {
        case .taproot:    return Color(hex: 0x8effc0)
        case .nodule:     return Color(hex: 0x6fd0ff)
        case .conduit:    return Color(hex: 0xffe27a)
        case .bloomcap:   return Color(hex: 0xff8ad0)
        case .prism:      return Color(hex: 0xb6fff0)
        case .sporangium: return Color(hex: 0x7affd0)
        case .heartwood:  return Color(hex: 0xc6a0ff)
        }
    }
    var sapCost: Double {
        switch self {
        case .taproot: return 4;   case .nodule: return 7;   case .conduit: return 12
        case .bloomcap: return 22; case .prism: return 30;   case .sporangium: return 18
        case .heartwood: return 55
        }
    }
    /// Water drawn from the budget.
    var water: Double {
        switch self {
        case .taproot: return 1;   case .nodule: return 0;   case .conduit: return 1
        case .bloomcap: return 3;  case .prism: return 2;    case .sporangium: return 1
        case .heartwood: return 4
        }
    }
    var baseOutput: Double {
        switch self {
        case .taproot: return 1.0; case .nodule: return 0.2; case .conduit: return 0.0
        case .bloomcap: return 4.0; case .prism: return 0.0; case .sporangium: return 0.5
        case .heartwood: return 6.0
        }
    }
    var blurb: String {
        switch self {
        case .taproot:    return "Reliable output and a trickle of Sap. The backbone of any web."
        case .nodule:     return "Fixes nitrogen: +3 to your Water budget. Draws no water itself."
        case .conduit:    return "No output, but boosts every adjacent node ×1.6."
        case .bloomcap:   return "Big output, thirsty. ×2 when touching 2+ Taproots."
        case .prism:      return "Adds the output of its strongest neighbour. Reward for dense, varied clusters."
        case .sporangium: return "Pumps Sap (+0.6/s) with a little output. Fuels a growing web."
        case .heartwood:  return "Multiplies the whole web ×1.5 — but drinks deeply. One is plenty."
        }
    }
}

struct RootWebStats {
    var prodMult: Double = 1
    var sapPerSec: Double = 0
    var waterUsed: Double = 0
    var waterBudget: Double = 1
    var totalOutput: Double = 0
    var health: Double = 1      // 1 = healthy, <1 = wilting
    var wilting: Bool = false
}

extension GameModel {

    /// Reachable from the first Bloom (which also seeds your first Sap).
    var rootWebUnlocked: Bool { blooms >= 1 || !rootNodes.isEmpty }

    /// Living Sapwells upgrade × the season's sap bonus × equipped cards.
    var sapGainMult: Double { pow(1.3, Double(level("sap_rate"))) * seasonSapMult * cardSapMult }

    /// Orthogonal neighbours of a cell on the 5×5 board.
    func rootNeighbours(_ cell: Int) -> [Int] {
        let r = cell / rootBoardCols, c = cell % rootBoardCols
        var out: [Int] = []
        if r > 0 { out.append(cell - rootBoardCols) }
        if r < rootBoardCols - 1 { out.append(cell + rootBoardCols) }
        if c > 0 { out.append(cell - 1) }
        if c < rootBoardCols - 1 { out.append(cell + 1) }
        return out
    }

    /// Water budget, including Nodules and the Deep Aquifer upgrade.
    var rootWaterBudget: Double {
        var budget = 5.0 + Double(worldIndex) + 3.0 * Double(level("sap_budget"))
        for (_, k) in rootNodes where k == .nodule { budget += 3 }
        return budget
    }

    func evaluateRootWeb() -> RootWebStats {
        var stats = RootWebStats()
        stats.waterBudget = rootWaterBudget
        guard !rootNodes.isEmpty else { return stats }

        let budget = rootWaterBudget
        var waterUsed = 0.0
        for (_, k) in rootNodes { waterUsed += k.water }
        let health = waterUsed > budget ? budget / max(waterUsed, 0.001) : 1.0

        // First pass: each cell's output incl. conduit adjacency + bloomcap cluster.
        var cellOut: [Int: Double] = [:]
        var sapRate = 0.0
        var heartwoods = 0
        for (cell, k) in rootNodes {
            var out = k.baseOutput
            let neighbours = rootNeighbours(cell)
            for nb in neighbours where rootNodes[nb] == .conduit { out *= 1.6 }
            if k == .bloomcap {
                let taps = neighbours.filter { rootNodes[$0] == .taproot }.count
                if taps >= 2 { out *= 2.0 }
            }
            switch k {
            case .heartwood:  heartwoods += 1; sapRate += 0.4
            case .taproot:    sapRate += 0.08
            case .bloomcap:   sapRate += 0.05
            case .sporangium: sapRate += 0.6
            default: break
            }
            cellOut[cell] = out
        }
        // Second pass: Prisms add the output of their strongest neighbour.
        var totalOutput = 0.0
        for (cell, k) in rootNodes {
            var out = cellOut[cell] ?? 0
            if k == .prism {
                let best = rootNeighbours(cell).compactMap { cellOut[$0] }.max() ?? 0
                out += best
            }
            totalOutput += out
        }
        totalOutput *= pow(1.5, Double(heartwoods)) * health
        totalOutput *= pow(1.25, Double(level("sap_out")))   // Rich Loam

        stats.prodMult = 1.0 + totalOutput * 0.30
        stats.sapPerSec = sapRate * health
        stats.waterUsed = waterUsed
        stats.totalOutput = totalOutput
        stats.health = health
        stats.wilting = waterUsed > budget
        return stats
    }

    var rootWebMult: Double { evaluateRootWeb().prodMult }

    /// Includes a small baseline trickle so the web is always reachable, plus
    /// Living Sapwells and the season bonus.
    var sapPerSecond: Double { (0.12 + evaluateRootWeb().sapPerSec) * sapGainMult }

    func canPlant(_ kind: RootNodeKind, at cell: Int) -> Bool {
        rootWebUnlocked && rootNodes[cell] == nil && sap >= kind.sapCost
    }

    func plant(_ kind: RootNodeKind, at cell: Int) {
        guard canPlant(kind, at: cell) else { return }
        sap -= kind.sapCost
        rootNodes[cell] = kind
    }

    /// Uproot a node, refunding half its Sap.
    func uproot(_ cell: Int) {
        guard let k = rootNodes[cell] else { return }
        sap += k.sapCost * 0.5
        rootNodes[cell] = nil
    }
}
