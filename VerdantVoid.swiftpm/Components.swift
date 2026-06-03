import SwiftUI

// MARK: - Card

/// Dark "glass" panel with a faint luminous edge — replaces frosted material
/// for the bioluminescent look.
struct Card: ViewModifier {
    var accent: Color = .white
    func body(content: Content) -> some View {
        content
            .padding(14)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Color.black.opacity(0.34))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .strokeBorder(
                        LinearGradient(colors: [accent.opacity(0.30), accent.opacity(0.05)],
                                       startPoint: .topLeading, endPoint: .bottomTrailing),
                        lineWidth: 1)
            )
    }
}
extension View {
    func card(accent: Color = .white) -> some View { modifier(Card(accent: accent)) }

    /// A soft outer glow in the given colour.
    func glow(_ color: Color, radius: CGFloat = 8, opacity: Double = 0.7) -> some View {
        shadow(color: color.opacity(opacity), radius: radius)
    }
}

// MARK: - Currency chip + bar

struct CurrencyChip: View {
    let currency: Currency
    let value: Double
    var perSecond: Double? = nil

    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: currency.glyph)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(currency.color)
                .glow(currency.color, radius: 5)
            VStack(alignment: .leading, spacing: 0) {
                Text(fmt(value))
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                    .monospacedDigit()
                if let ps = perSecond, ps > 0 {
                    Text("+\(fmt(ps))/s")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(currency.color.opacity(0.85))
                        .monospacedDigit()
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 7)
        .background(Capsule().fill(Color.black.opacity(0.45)))
        .overlay(Capsule().strokeBorder(currency.color.opacity(0.45), lineWidth: 1))
    }
}

/// Top bar showing every currency the player has unlocked so far.
struct CurrencyBar: View {
    let model: GameModel
    var showPollen: Bool { model.pollen > 0 || model.blooms > 0 }
    var showBiomass: Bool { model.biomass > 0 || model.terraforms > 0 }
    var showStardust: Bool { model.stardust > 0 || model.singularities > 0 }
    var showSap: Bool { model.rootWebUnlocked }

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                CurrencyChip(currency: .motes, value: model.motes, perSecond: model.motesPerSecond)
                if showPollen   { CurrencyChip(currency: .pollen, value: model.pollen) }
                if showBiomass  { CurrencyChip(currency: .biomass, value: model.biomass) }
                if showSap      { CurrencyChip(currency: .sap, value: model.sap, perSecond: model.sapPerSecond) }
                if showStardust { CurrencyChip(currency: .stardust, value: model.stardust) }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 6)
        }
    }
}

// MARK: - Action button

/// Luminous outline button used for purchases and prestige.
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
                    if let subtitle { Text(subtitle).font(.system(size: 12, weight: .regular)).opacity(0.85) }
                }
                Spacer(minLength: 0)
            }
            .foregroundStyle(enabled ? tint : Color.white.opacity(0.4))
            .padding(.vertical, 12).padding(.horizontal, 16)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(enabled ? tint.opacity(0.14) : Color.white.opacity(0.04))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(enabled ? tint.opacity(0.8) : Color.white.opacity(0.10), lineWidth: 1)
            )
            .glow(enabled ? tint : .clear, radius: 6, opacity: 0.5)
        }
        .disabled(!enabled)
        .buttonStyle(.plain)
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
        .foregroundStyle(.white.opacity(0.6))
        .padding(.horizontal, 4)
    }
}
