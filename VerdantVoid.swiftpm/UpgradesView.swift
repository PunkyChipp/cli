import SwiftUI

struct UpgradesView: View {
    @Environment(GameModel.self) private var model
    @State private var selected: Currency = .motes

    // Only show currency tabs the player has access to.
    private var availableCurrencies: [Currency] {
        var list: [Currency] = [.motes]
        if model.pollen > 0 || model.blooms > 0 { list.append(.pollen) }
        if model.biomass > 0 || model.terraforms > 0 { list.append(.biomass) }
        return list
    }

    var body: some View {
        VStack(spacing: 10) {
            CurrencyBar(model: model)

            Picker("Currency", selection: $selected) {
                ForEach(availableCurrencies) { c in
                    Text(c.name).tag(c)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16)

            ScrollView {
                VStack(spacing: 12) {
                    ForEach(model.upgrades(for: selected)) { def in
                        UpgradeRow(def: def)
                    }
                }
                .padding(16)
            }
        }
        .onChange(of: availableCurrencies.count) { _, _ in
            if !availableCurrencies.contains(selected) { selected = .motes }
        }
    }
}

struct UpgradeRow: View {
    @Environment(GameModel.self) private var model
    let def: UpgradeDef

    var body: some View {
        let lvl = model.level(def.id)
        let maxed = lvl >= def.maxLevel
        let cost = def.cost(at: lvl)
        let affordable = !maxed && model.amount(of: def.currency) >= cost

        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(def.name).font(.system(.headline, design: .rounded).weight(.bold))
                    Text("Lv \(lvl)/\(def.maxLevel)")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundStyle(def.currency.color)
                }
                Text(def.info)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.white.opacity(0.65))
                    .fixedSize(horizontal: false, vertical: true)
            }
            .foregroundStyle(.white)
            Spacer(minLength: 8)

            Button { model.buyUpgrade(def.id) } label: {
                VStack(spacing: 1) {
                    if maxed {
                        Text("MAX").font(.system(size: 13, weight: .heavy, design: .rounded))
                    } else {
                        Image(systemName: def.currency.glyph).font(.system(size: 11, weight: .bold))
                        Text(fmt(cost)).font(.system(size: 13, weight: .bold, design: .rounded))
                    }
                }
                .foregroundStyle(.white)
                .frame(width: 78)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(maxed ? Color.white.opacity(0.10)
                              : (affordable ? def.currency.color.opacity(0.85) : Color.white.opacity(0.08)))
                )
            }
            .buttonStyle(.plain)
            .disabled(!affordable)
        }
        .card()
    }
}
