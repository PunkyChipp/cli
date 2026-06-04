import SwiftUI

struct GrowView: View {
    @Environment(GameModel.self) private var model

    var body: some View {
        VStack(spacing: 0) {
            CurrencyBar(model: model)
            ScrollView {
                VStack(spacing: 12) {
                    SectionTitle(text: "Lifeforms", glyph: "leaf.fill")
                    ForEach(Array(model.generators.enumerated()), id: \.element.id) { index, gen in
                        GeneratorRow(index: index)
                            .opacity(isVisible(index) ? 1 : 0.5)
                    }
                    Text("Each lifeform grows the one below it. Spores turn into Motes.")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.white.opacity(0.6))
                        .multilineTextAlignment(.center)
                        .padding(.top, 4)
                }
                .padding(16)
            }
        }
    }

    // A tier becomes "interesting" once the one below has at least one purchase.
    private func isVisible(_ index: Int) -> Bool {
        if index == 0 { return true }
        return model.generators[index - 1].bought > 0 || model.generators[index].count > 0
    }
}

struct GeneratorRow: View {
    @Environment(GameModel.self) private var model
    let index: Int

    var body: some View {
        let gen = model.generators[index]
        let cost = model.effectiveCost(gen)
        let affordable = model.motes >= cost
        let produces = index == 0 ? "Motes" : model.generators[index - 1].name
        let milestone = model.milestoneMult(gen.bought)
        let nextAt = model.nextMilestone(gen.bought)

        VStack(spacing: 10) {
            HStack(spacing: 12) {
                Image(systemName: gen.glyph)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(model.currentWorld.accent)
                    .frame(width: 34)
                VStack(alignment: .leading, spacing: 2) {
                    HStack {
                        Text(gen.name).font(.system(.headline, design: .rounded).weight(.bold))
                        Text("×\(fmtCount(gen.count))")
                            .font(.system(.subheadline, design: .rounded).weight(.semibold))
                            .foregroundStyle(.white.opacity(0.6))
                        if milestone > 1 {
                            Text("⚡︎×\(fmt(milestone))")
                                .font(.system(size: 11, weight: .heavy, design: .rounded))
                                .foregroundStyle(Color(hex: 0xffe27a))
                        }
                    }
                    Text("Makes \(produces)  ·  ⚡︎ at \(nextAt) bought")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.white.opacity(0.55))
                }
                Spacer()
            }
            .foregroundStyle(.white)

            HStack(spacing: 10) {
                Button { model.buy(index) } label: {
                    buyLabel(title: "Buy 1", cost: fmt(cost), enabled: affordable)
                }
                .buttonStyle(.plain).disabled(!affordable)

                Button { model.buyMax(index) } label: {
                    buyLabel(title: "Buy Max", cost: nil, enabled: affordable)
                }
                .buttonStyle(.plain).disabled(!affordable)
            }
        }
        .card()
    }

    private func buyLabel(title: String, cost: String?, enabled: Bool) -> some View {
        VStack(spacing: 1) {
            Text(title).font(.system(size: 14, weight: .bold, design: .rounded))
            if let cost { Text(cost).font(.system(size: 11, weight: .semibold)).opacity(0.85) }
        }
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 9)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(enabled ? Currency.motes.color.opacity(0.85) : Color.white.opacity(0.08))
        )
    }
}
