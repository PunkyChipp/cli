import SwiftUI

/// Frosted card background used throughout the UI.
struct Card: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(14)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .strokeBorder(.white.opacity(0.12), lineWidth: 1)
            )
    }
}
extension View {
    func card() -> some View { modifier(Card()) }
}

/// A single currency readout chip.
struct CurrencyChip: View {
    let currency: Currency
    let value: Double
    var perSecond: Double? = nil

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: currency.glyph)
                .foregroundStyle(currency.color)
                .font(.system(size: 14, weight: .bold))
            VStack(alignment: .leading, spacing: 0) {
                Text(fmt(value))
                    .font(.system(.subheadline, design: .rounded).weight(.bold))
                    .foregroundStyle(.white)
                    .monospacedDigit()
                if let ps = perSecond, ps > 0 {
                    Text("+\(fmt(ps))/s")
                        .font(.system(size: 9, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.6))
                        .monospacedDigit()
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 7)
        .background(.black.opacity(0.28), in: Capsule())
        .overlay(Capsule().strokeBorder(currency.color.opacity(0.4), lineWidth: 1))
    }
}

/// Top bar showing all currencies the player has unlocked so far.
struct CurrencyBar: View {
    let model: GameModel

    var showPollen: Bool { model.pollen > 0 || model.blooms > 0 }
    var showBiomass: Bool { model.biomass > 0 || model.terraforms > 0 }
    var showStardust: Bool { model.stardust > 0 || model.singularities > 0 }

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                CurrencyChip(currency: .motes, value: model.motes, perSecond: model.motesPerSecond)
                if showPollen   { CurrencyChip(currency: .pollen, value: model.pollen) }
                if showBiomass  { CurrencyChip(currency: .biomass, value: model.biomass) }
                if showStardust { CurrencyChip(currency: .stardust, value: model.stardust) }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 6)
        }
    }
}

/// The themed sky background for the current world.
struct WorldBackground: View {
    let world: WorldDef
    var body: some View {
        LinearGradient(colors: world.sky, startPoint: .top, endPoint: .bottom)
            .ignoresSafeArea()
            .overlay(
                world.accent.opacity(0.06)
                    .ignoresSafeArea()
            )
    }
}

/// Prominent action button used for purchases and prestige.
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
                Image(systemName: glyph).font(.system(size: 18, weight: .bold))
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.system(.headline, design: .rounded).weight(.bold))
                    if let subtitle { Text(subtitle).font(.system(size: 12, weight: .medium)).opacity(0.85) }
                }
                Spacer(minLength: 0)
            }
            .foregroundStyle(.white)
            .padding(.vertical, 12).padding(.horizontal, 16)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(enabled ? tint.opacity(0.9) : Color.white.opacity(0.08))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(.white.opacity(enabled ? 0.25 : 0.08), lineWidth: 1)
            )
        }
        .disabled(!enabled)
        .buttonStyle(.plain)
    }
}

/// Section heading.
struct SectionTitle: View {
    let text: String
    let glyph: String
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: glyph).font(.system(size: 13, weight: .bold))
            Text(text).font(.system(.subheadline, design: .rounded).weight(.heavy))
                .textCase(.uppercase).tracking(1)
            Spacer()
        }
        .foregroundStyle(.white.opacity(0.7))
        .padding(.horizontal, 4)
    }
}
