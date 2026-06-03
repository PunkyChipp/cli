import SwiftUI

/// A "world" is a biome you Terraform into. Each one re-skins the whole game
/// with its own sky gradient + accent colour and applies a production modifier,
/// so crossing into a new world feels like arriving somewhere new.
struct WorldDef: Identifiable {
    let id: Int
    let name: String
    let blurb: String
    let prodMult: Double
    let sky: [Color]
    let accent: Color
    let glyph: String
}

extension Color {
    init(hex: UInt32) {
        let r = Double((hex >> 16) & 0xFF) / 255.0
        let g = Double((hex >> 8) & 0xFF) / 255.0
        let b = Double(hex & 0xFF) / 255.0
        self = Color(red: r, green: g, blue: b)
    }
}

enum Worlds {
    static let all: [WorldDef] = [
        WorldDef(id: 0, name: "The Barren Void",   blurb: "Nothing grows here yet. Coax the first spores from the dark.",
                 prodMult: 1.0,  sky: [Color(hex: 0x1a1a24), Color(hex: 0x2d2d3a)], accent: Color(hex: 0x9bd1a6), glyph: "circle.dotted"),
        WorldDef(id: 1, name: "Mossfield Flats",   blurb: "A thin green carpet creeps across the stone. Life takes hold.",
                 prodMult: 1.5,  sky: [Color(hex: 0x14331f), Color(hex: 0x2f6b3a)], accent: Color(hex: 0xb6f29a), glyph: "leaf.fill"),
        WorldDef(id: 2, name: "Ashen Wastes",      blurb: "Cinders drift on hot wind. Hardy roots crack the scorched crust.",
                 prodMult: 2.1,  sky: [Color(hex: 0x2b1410), Color(hex: 0x73291a)], accent: Color(hex: 0xff9d5c), glyph: "flame.fill"),
        WorldDef(id: 3, name: "Frostfall Tundra",  blurb: "Frozen and still. Yet under the ice, something stubbornly blooms.",
                 prodMult: 2.9,  sky: [Color(hex: 0x10303f), Color(hex: 0x4fb9d6)], accent: Color(hex: 0xd7f6ff), glyph: "snowflake"),
        WorldDef(id: 4, name: "Verdant Expanse",   blurb: "An ocean of green to the horizon. This is what you were growing toward.",
                 prodMult: 3.9,  sky: [Color(hex: 0x14401c), Color(hex: 0x3fbf55)], accent: Color(hex: 0xeaffb0), glyph: "tree.fill"),
        WorldDef(id: 5, name: "Crystal Caverns",   blurb: "Light fractures through living crystal. Growth refracts and multiplies.",
                 prodMult: 5.2,  sky: [Color(hex: 0x231040), Color(hex: 0x7a3fd6)], accent: Color(hex: 0xc6a0ff), glyph: "diamond.fill"),
        WorldDef(id: 6, name: "Sunken Abyss",      blurb: "Pressure and dark. Bioluminescent gardens pulse far below.",
                 prodMult: 6.8,  sky: [Color(hex: 0x041326), Color(hex: 0x0a4f73)], accent: Color(hex: 0x5fe0d0), glyph: "drop.fill"),
        WorldDef(id: 7, name: "Emberforge Core",   blurb: "Magma rivers and metal vines. Growth tempered in raw heat.",
                 prodMult: 8.9,  sky: [Color(hex: 0x1a0a05), Color(hex: 0xc23a12)], accent: Color(hex: 0xffc24d), glyph: "bolt.fill"),
        WorldDef(id: 8, name: "Stormcrest Skies",  blurb: "Floating isles wreathed in lightning. Life that drinks the storm.",
                 prodMult: 11.5, sky: [Color(hex: 0x14143f), Color(hex: 0x4b4bd6)], accent: Color(hex: 0xfff07a), glyph: "cloud.bolt.fill"),
        WorldDef(id: 9, name: "The Living Star",   blurb: "You did it. The world itself is alive, and burning bright.",
                 prodMult: 15.0, sky: [Color(hex: 0x3a2a05), Color(hex: 0xffb700)], accent: Color(hex: 0xfff7d6), glyph: "sun.max.fill")
    ]

    static func world(for index: Int) -> WorldDef {
        let clamped = min(max(index, 0), all.count - 1)
        return all[clamped]
    }
}
