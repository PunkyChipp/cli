import SwiftUI
import UIKit

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
