import SwiftUI

struct PearlsView: View {
    @Environment(GameModel.self) private var model
    private let pearlColor = Color(hex: 0xf5e9ff)

    var body: some View {
        VStack(spacing: 0) {
            CurrencyBar(model: model)
            ScrollView {
                VStack(spacing: 14) {
                    ebbCard
                    SectionTitle(text: "Pearl Upgrades", glyph: "circle.circle.fill")
                    Text("Capped, permanent boosts. They survive every Ebb — so each Ebb rebuilds faster than the last.")
                        .font(.system(size: 12)).foregroundStyle(.white.opacity(0.6))
                        .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 4)
                    ForEach(GameModel.pearlUpgrades) { up in pearlRow(up) }
                }
                .padding(16)
            }
        }
    }

    private var ebbCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                Image(systemName: "wind").font(.system(size: 26, weight: .bold)).foregroundStyle(pearlColor)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Ebb the Tide").font(.system(.title2, design: .rounded).weight(.heavy)).foregroundStyle(.white)
                    Text("Reset Lumens, Plankton & Tide for Pearls").font(.system(size: 11, weight: .bold))
                        .foregroundStyle(pearlColor).textCase(.uppercase).tracking(1)
                }
                Spacer()
            }
            Text("The fast, repeatable reset. Pearls never reset. Ebb early and often.")
                .font(.system(size: 13)).foregroundStyle(.white.opacity(0.7))
            HStack(spacing: 6) {
                Image(systemName: model.canEbb ? "checkmark.circle.fill" : "hourglass")
                    .foregroundStyle(model.canEbb ? .green : .white.opacity(0.5))
                Text(model.canEbb ? "Ready — gain \(fmt(model.pearlGain)) Pearls"
                     : "Earn more Lumens this run (\(fmt(model.lumensThisEbb)) so far)")
                    .font(.system(size: 12, weight: .semibold)).foregroundStyle(.white.opacity(0.85))
            }
            ActionButton(title: "Ebb for \(fmt(model.pearlGain)) Pearls", glyph: "wind",
                         tint: pearlColor, enabled: model.canEbb) { model.ebb() }
            Text("Ebbs: \(model.ebbs)").font(.system(size: 11, weight: .semibold, design: .rounded))
                .foregroundStyle(.white.opacity(0.5))
        }
        .card(accent: pearlColor)
    }

    private func pearlRow(_ up: PearlUpgrade) -> some View {
        let lvl = model.level(up.id)
        let maxed = lvl >= up.cap
        let cost = up.cost(at: lvl)
        let can = model.canBuyPearl(up.id)
        return HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(up.name).font(.system(.headline, design: .rounded).weight(.bold))
                    Text("Lv \(lvl)/\(up.cap)").font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundStyle(pearlColor)
                }
                Text(up.info).font(.system(size: 12, weight: .medium)).foregroundStyle(.white.opacity(0.65))
                    .fixedSize(horizontal: false, vertical: true)
            }
            .foregroundStyle(.white)
            Spacer(minLength: 8)
            Button { model.buyPearl(up.id) } label: {
                VStack(spacing: 1) {
                    if maxed { Text("MAX").font(.system(size: 13, weight: .heavy, design: .rounded)) }
                    else {
                        Image(systemName: "circle.circle.fill").font(.system(size: 11, weight: .bold))
                        Text(fmt(cost)).font(.system(size: 13, weight: .bold, design: .rounded))
                    }
                }
                .foregroundStyle(.white).frame(width: 80).padding(.vertical, 10)
                .background(RoundedRectangle(cornerRadius: 12)
                    .fill(maxed ? Color.white.opacity(0.10) : (can ? pearlColor.opacity(0.85) : Color.white.opacity(0.08))))
            }
            .buttonStyle(.plain).disabled(!can)
        }
        .card(accent: maxed ? pearlColor : .white)
    }
}
