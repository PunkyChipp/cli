import SwiftUI

// MARK: - Card

struct Card: ViewModifier {
    var accent: Color = .white
    func body(content: Content) -> some View {
        content
            .padding(14)
            .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Color.black.opacity(0.34)))
            .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous)
                .strokeBorder(LinearGradient(colors: [accent.opacity(0.30), accent.opacity(0.05)],
                                             startPoint: .topLeading, endPoint: .bottomTrailing), lineWidth: 1))
    }
}
extension View {
    func card(accent: Color = .white) -> some View { modifier(Card(accent: accent)) }
    func glow(_ color: Color, radius: CGFloat = 8, opacity: Double = 0.7) -> some View {
        shadow(color: color.opacity(opacity), radius: radius)
    }
}

// MARK: - Currency chip + bar

struct CurrencyChip: View {
    let name: String
    let value: Double
    let color: Color
    let glyph: String
    var perSecond: Double? = nil
    var isInt: Bool = false

    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: glyph).font(.system(size: 13, weight: .semibold))
                .foregroundStyle(color).glow(color, radius: 5)
            VStack(alignment: .leading, spacing: 0) {
                Text(isInt ? fmtCount(value) : fmt(value))
                    .font(.system(size: 15, weight: .semibold)).foregroundStyle(.white).monospacedDigit()
                if let ps = perSecond, ps > 0 {
                    Text("+\(fmt(ps))/s").font(.system(size: 9, weight: .medium))
                        .foregroundStyle(color.opacity(0.85)).monospacedDigit()
                }
            }
        }
        .padding(.horizontal, 12).padding(.vertical, 7)
        .background(Capsule().fill(Color.black.opacity(0.45)))
        .overlay(Capsule().strokeBorder(color.opacity(0.45), lineWidth: 1))
    }
}

struct CurrencyBar: View {
    let model: GameModel
    var body: some View {
        let z = model.currentZone
        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                if model.zone == 0 {
                    CurrencyChip(name: "Lumens", value: model.lumens, color: z.accent, glyph: "sun.max.fill", perSecond: model.lumensPerSecond)
                    if model.pearls > 0 || model.ebbs > 0 {
                        CurrencyChip(name: "Pearls", value: model.pearls, color: Color(hex: 0xf5e9ff), glyph: "circle.circle.fill", isInt: true)
                    }
                } else {
                    CurrencyChip(name: "Glow", value: model.glow, color: z.accent, glyph: "sparkles", perSecond: model.glowPerSecond)
                }
                if model.pressure > 0 {
                    CurrencyChip(name: "Pressure", value: Double(model.pressure), color: Color(hex: 0x7fe4ff), glyph: "arrow.down.circle.fill", isInt: true)
                }
            }
            .padding(.horizontal, 16).padding(.vertical, 6)
        }
    }
}

// MARK: - Action button

struct ActionButton: View {
    let title: String
    let subtitle: String?
    let glyph: String
    let tint: Color
    let enabled: Bool
    let action: () -> Void

    init(title: String, subtitle: String? = nil, glyph: String, tint: Color, enabled: Bool, action: @escaping () -> Void) {
        self.title = title; self.subtitle = subtitle; self.glyph = glyph
        self.tint = tint; self.enabled = enabled; self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: glyph).font(.system(size: 17, weight: .semibold))
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.system(size: 16, weight: .semibold))
                    if let subtitle { Text(subtitle).font(.system(size: 12)).opacity(0.85) }
                }
                Spacer(minLength: 0)
            }
            .foregroundStyle(enabled ? tint : Color.white.opacity(0.4))
            .padding(.vertical, 12).padding(.horizontal, 16).frame(maxWidth: .infinity)
            .background(RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(enabled ? tint.opacity(0.14) : Color.white.opacity(0.04)))
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous)
                .strokeBorder(enabled ? tint.opacity(0.8) : Color.white.opacity(0.10), lineWidth: 1))
            .glow(enabled ? tint : .clear, radius: 6, opacity: 0.5)
        }
        .disabled(!enabled).buttonStyle(.plain)
    }
}

// MARK: - Section title

struct SectionTitle: View {
    let text: String
    let glyph: String
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: glyph).font(.system(size: 12, weight: .semibold))
            Text(text).font(.system(size: 13, weight: .semibold)).tracking(2).textCase(.uppercase)
            Spacer()
        }
        .foregroundStyle(.white.opacity(0.6)).padding(.horizontal, 4)
    }
}

// MARK: - Stat pill (shows the interlock: "boosted by …")

struct BoostPill: View {
    let text: String
    let color: Color
    var body: some View {
        Text(text)
            .font(.system(size: 10, weight: .bold, design: .rounded))
            .foregroundStyle(color)
            .padding(.horizontal, 7).padding(.vertical, 3)
            .background(Capsule().fill(color.opacity(0.14)))
    }
}
