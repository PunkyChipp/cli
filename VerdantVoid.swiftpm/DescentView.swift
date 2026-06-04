import SwiftUI

/// The depth map — shows the whole descent and lets you drop to the next zone
/// once you've earned it. The "movement between zones" lives here.
struct DescentView: View {
    @Environment(GameModel.self) private var model

    var body: some View {
        VStack(spacing: 0) {
            CurrencyBar(model: model)
            ScrollView {
                VStack(spacing: 14) {
                    if model.zone == 0 { descentCard }
                    SectionTitle(text: "The Descent", glyph: "arrow.down.to.line")
                    ForEach(Zones.all) { z in zoneRow(z) }
                }
                .padding(16)
            }
        }
    }

    private var descentCard: some View {
        let z = Zones.zone(1)
        let ready = model.descentAvailable
        return VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                Image(systemName: "arrow.down.circle.fill").font(.system(size: 26, weight: .bold)).foregroundStyle(z.accent)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Descend").font(.system(.title2, design: .rounded).weight(.heavy)).foregroundStyle(.white)
                    Text("Leave the Shallows for the Twilight Reach").font(.system(size: 11, weight: .bold))
                        .foregroundStyle(z.accent).textCase(.uppercase).tracking(1)
                }
                Spacer()
            }
            Text("Each Descent permanently multiplies everything (Pressure ×2) and opens a new world with its own life and systems.")
                .font(.system(size: 13)).foregroundStyle(.white.opacity(0.7))
            HStack(spacing: 6) {
                Image(systemName: ready ? "checkmark.circle.fill" : "lock.fill")
                    .foregroundStyle(ready ? .green : .white.opacity(0.5))
                Text(model.hasMilestone(40)
                     ? "Need \(fmt(model.descentReq)) Pearls (have \(fmt(model.pearls)))"
                     : "Reach Tide milestone 40 — The Drop-Off")
                    .font(.system(size: 12, weight: .semibold)).foregroundStyle(.white.opacity(0.85))
            }
            ActionButton(title: "Descend to the Twilight Reach", glyph: "arrow.down.circle.fill",
                         tint: z.accent, enabled: ready) { model.descend() }
        }
        .card(accent: z.accent)
    }

    private func zoneRow(_ z: ZoneDef) -> some View {
        let isCurrent = z.id == model.zone
        let reached = z.id <= model.maxZone
        return HStack(spacing: 12) {
            ZStack {
                Circle().fill(LinearGradient(colors: z.sky, startPoint: .top, endPoint: .bottom))
                    .frame(width: 46, height: 46)
                    .overlay(Circle().strokeBorder(z.accent.opacity(reached ? 0.8 : 0.25), lineWidth: isCurrent ? 2 : 1))
                Image(systemName: reached ? "drop.fill" : "lock.fill")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(reached ? z.accent : .white.opacity(0.3)).glow(reached ? z.accent : .clear, radius: 4)
            }
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(reached ? z.name : "Depth \(z.id + 1)").font(.system(size: 15, weight: .semibold)).foregroundStyle(.white)
                    if isCurrent { BoostPill(text: "HERE", color: z.accent) }
                }
                Text(reached ? z.blurb : "Descend deeper to reveal what waits here.")
                    .font(.system(size: 12)).foregroundStyle(.white.opacity(reached ? 0.7 : 0.4))
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 4)
        }
        .card(accent: reached ? z.accent : .white).opacity(reached ? 1 : 0.6)
    }
}
