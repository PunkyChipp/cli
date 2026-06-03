import SwiftUI
import UIKit

/// A "world" is a biome you Terraform into. In the bioluminescent art direction
/// each world is a near-black *field* lit by two glow colours, so crossing into a
/// new world changes the entire colour of the light.
struct WorldDef: Identifiable {
    let id: Int
    let name: String
    let blurb: String
    let prodMult: Double
    /// Dark background gradient (top, bottom).
    let sky: [Color]
    /// Primary glow / accent colour.
    let accent: Color
    /// Secondary glow colour, used for highlights and particles.
    let glow2: Color
    let glyph: String
}

extension Color {
    init(hex: UInt32) {
        let r = Double((hex >> 16) & 0xFF) / 255.0
        let g = Double((hex >> 8) & 0xFF) / 255.0
        let b = Double(hex & 0xFF) / 255.0
        self = Color(red: r, green: g, blue: b)
    }

    /// Linear blend toward another colour (UIKit-based so it works on a single Color).
    func blended(with other: Color, amount: Double) -> Color {
        let a = max(0, min(1, amount))
        let c1 = UIColor(self), c2 = UIColor(other)
        var r1: CGFloat = 0, g1: CGFloat = 0, b1: CGFloat = 0, a1: CGFloat = 0
        var r2: CGFloat = 0, g2: CGFloat = 0, b2: CGFloat = 0, a2: CGFloat = 0
        c1.getRed(&r1, green: &g1, blue: &b1, alpha: &a1)
        c2.getRed(&r2, green: &g2, blue: &b2, alpha: &a2)
        return Color(red: Double(r1 + (r2 - r1) * a),
                     green: Double(g1 + (g2 - g1) * a),
                     blue: Double(b1 + (b2 - b1) * a))
    }
}

enum Worlds {
    static let all: [WorldDef] = [
        WorldDef(id: 0, name: "The Barren Void",  blurb: "Nothing grows here yet. Coax the first light from the dark.",
                 prodMult: 1.0,  sky: [Color(hex: 0x05060a), Color(hex: 0x0b0d16)], accent: Color(hex: 0x5fe6c0), glow2: Color(hex: 0x6f7bff), glyph: "circle.dotted"),
        WorldDef(id: 1, name: "Mossfield Flats",  blurb: "A thin glow creeps across the stone. Life takes hold.",
                 prodMult: 1.5,  sky: [Color(hex: 0x04100a), Color(hex: 0x0a1f14)], accent: Color(hex: 0x6cff9e), glow2: Color(hex: 0xd6ff7a), glyph: "leaf.fill"),
        WorldDef(id: 2, name: "Ashen Wastes",     blurb: "Embers drift on hot wind. Hardy filaments crack the crust.",
                 prodMult: 2.1,  sky: [Color(hex: 0x120604), Color(hex: 0x23100a)], accent: Color(hex: 0xff8a5c), glow2: Color(hex: 0xffd25c), glyph: "flame.fill"),
        WorldDef(id: 3, name: "Frostfall Tundra", blurb: "Frozen and still. Yet under the ice, something stubbornly glows.",
                 prodMult: 2.9,  sky: [Color(hex: 0x04111a), Color(hex: 0x08222e)], accent: Color(hex: 0x7fe4ff), glow2: Color(hex: 0xc7b6ff), glyph: "snowflake"),
        WorldDef(id: 4, name: "Verdant Expanse",  blurb: "An ocean of light to the horizon. This is what you grew toward.",
                 prodMult: 3.9,  sky: [Color(hex: 0x04140a), Color(hex: 0x0a2614)], accent: Color(hex: 0x8effc0), glow2: Color(hex: 0xf0ff9a), glyph: "tree.fill"),
        WorldDef(id: 5, name: "Crystal Caverns",  blurb: "Light fractures through living crystal and multiplies.",
                 prodMult: 5.2,  sky: [Color(hex: 0x0a0418), Color(hex: 0x170a2e)], accent: Color(hex: 0xc08bff), glow2: Color(hex: 0x62e6ff), glyph: "diamond.fill"),
        WorldDef(id: 6, name: "Sunken Abyss",     blurb: "Pressure and dark. Bioluminescent gardens pulse far below.",
                 prodMult: 6.8,  sky: [Color(hex: 0x02070f), Color(hex: 0x04131f)], accent: Color(hex: 0x58f0e0), glow2: Color(hex: 0x4f7bff), glyph: "drop.fill"),
        WorldDef(id: 7, name: "Emberforge Core",  blurb: "Magma rivers and metal vines. Growth tempered in raw heat.",
                 prodMult: 8.9,  sky: [Color(hex: 0x100502), Color(hex: 0x240a04)], accent: Color(hex: 0xff9d4d), glow2: Color(hex: 0xffe14d), glyph: "bolt.fill"),
        WorldDef(id: 8, name: "Stormcrest Skies", blurb: "Floating isles wreathed in lightning. Life that drinks the storm.",
                 prodMult: 11.5, sky: [Color(hex: 0x06061a), Color(hex: 0x0c0c2e)], accent: Color(hex: 0x9aa6ff), glow2: Color(hex: 0xfff07a), glyph: "cloud.bolt.fill"),
        WorldDef(id: 9, name: "The Living Star",  blurb: "You did it. The world itself is alive, and burning bright.",
                 prodMult: 15.0, sky: [Color(hex: 0x1a1405), Color(hex: 0x2e2410)], accent: Color(hex: 0xffd86b), glow2: Color(hex: 0xfff7d6), glyph: "sun.max.fill")
    ]

    static func world(for index: Int) -> WorldDef {
        let clamped = min(max(index, 0), all.count - 1)
        return all[clamped]
    }
}
