import SwiftUI

/// A depth zone. Descending changes the entire palette and ambient light, so each
/// zone reads as a distinct place. `light` (1 = bright surface, 0 = lightless deep)
/// drives how dark the scene is and how much your own bioluminescence stands out.
struct ZoneDef: Identifiable {
    let id: Int
    let name: String
    let blurb: String
    let sky: [Color]      // top, bottom gradient
    let accent: Color     // primary glow
    let glow2: Color      // secondary glow
    let light: Double     // ambient daylight 0…1
}

enum Zones {
    static let all: [ZoneDef] = [
        ZoneDef(id: 0, name: "Sunlit Shallows",
                blurb: "Warm light pours through the surface. Plankton bloom in the glow.",
                sky: [Color(hex: 0x1aa6c8), Color(hex: 0x0a5b86)], accent: Color(hex: 0x8ff0ff), glow2: Color(hex: 0xfff2a6), light: 1.0),
        ZoneDef(id: 1, name: "Twilight Reach",
                blurb: "The last blue light fades. Down here, things make their own.",
                sky: [Color(hex: 0x0a3b6e), Color(hex: 0x06173a)], accent: Color(hex: 0x6fa8ff), glow2: Color(hex: 0x9a6fff), light: 0.55),
        ZoneDef(id: 2, name: "The Midnight",
                blurb: "True dark. Cold violet lures drift in a starless sea.",
                sky: [Color(hex: 0x0a0a24), Color(hex: 0x05021a)], accent: Color(hex: 0xb46fff), glow2: Color(hex: 0x5fd0ff), light: 0.22),
        ZoneDef(id: 3, name: "The Abyss",
                blurb: "Crushing black. Only your own light remains.",
                sky: [Color(hex: 0x04060f), Color(hex: 0x01030a)], accent: Color(hex: 0x4ff0e0), glow2: Color(hex: 0x4f7bff), light: 0.10),
        ZoneDef(id: 4, name: "Hadal Trench",
                blurb: "The floor of the world. Strange green fire seeps from the rock.",
                sky: [Color(hex: 0x02100a), Color(hex: 0x010604)], accent: Color(hex: 0x7affc0), glow2: Color(hex: 0xd6ff7a), light: 0.07),
        ZoneDef(id: 5, name: "The Lightless",
                blurb: "Below where light was ever meant to go.",
                sky: [Color(hex: 0x0a0210), Color(hex: 0x040008)], accent: Color(hex: 0xff6fd0), glow2: Color(hex: 0x9a6fff), light: 0.04)
    ]

    static func zone(_ index: Int) -> ZoneDef {
        all[min(max(index, 0), all.count - 1)]
    }
    static var count: Int { all.count }
}
