import SwiftUI

/// The Spore Codex: spend Stardust on packs, collect cards, and equip a limited
/// loadout. Embedded in the Cosmos tab.
struct CardCodexView: View {
    @Environment(GameModel.self) private var model

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                pullHeader
                equippedStrip
                ForEach(CardRarity.allCases) { rarity in
                    raritySection(rarity)
                }
            }
            .padding(16)
        }
    }

    // MARK: Pull header

    private var pullHeader: some View {
        let owned = model.ownedCards.count
        let total = Cards.all.count
        return VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                Image(systemName: "rectangle.stack.fill").font(.system(size: 24, weight: .bold))
                    .foregroundStyle(Currency.stardust.color)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Spore Codex").font(.system(.title3, design: .rounded).weight(.heavy))
                    Text("\(owned)/\(total) collected · set bonus ×\(fmt(model.cardSetMult))")
                        .font(.system(size: 11, weight: .semibold)).foregroundStyle(.white.opacity(0.6))
                }
                Spacer()
            }
            .foregroundStyle(.white)

            HStack(spacing: 6) {
                Image(systemName: "square.grid.2x2.fill").foregroundStyle(model.currentWorld.accent)
                Text("Loadout \(model.equippedCards.count)/\(model.cardSlots) slots — complete a rarity for another slot.")
                    .font(.system(size: 12, weight: .semibold)).foregroundStyle(.white.opacity(0.85))
            }

            if let r = model.nextPullRarity {
                ActionButton(title: "Open Spore Pack",
                             subtitle: "\(fmt(model.packCost)) Stardust · next card: \(r.name)",
                             glyph: "sparkles", tint: Currency.stardust.color,
                             enabled: model.canPull) { model.pullPack() }
            } else {
                Text("✦ Every card collected. The Codex is complete.")
                    .font(.system(size: 13, weight: .bold)).foregroundStyle(Currency.stardust.color)
            }
        }
        .card(accent: Currency.stardust.color)
    }

    // MARK: Equipped strip

    @ViewBuilder private var equippedStrip: some View {
        if !model.equippedDefs.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(model.equippedDefs) { def in
                        VStack(spacing: 3) {
                            Image(systemName: def.glyph).font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(def.rarity.color)
                            Text(def.name).font(.system(size: 10, weight: .semibold)).foregroundStyle(.white)
                        }
                        .frame(width: 72).padding(.vertical, 8)
                        .background(RoundedRectangle(cornerRadius: 10).fill(Color.black.opacity(0.4)))
                        .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(def.rarity.color.opacity(0.6), lineWidth: 1))
                    }
                }
                .padding(.horizontal, 2)
            }
        }
    }

    // MARK: Rarity section

    private func raritySection(_ rarity: CardRarity) -> some View {
        let pool = Cards.of(rarity)
        return VStack(spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "seal.fill").font(.system(size: 12, weight: .semibold))
                Text(rarity.name).font(.system(size: 13, weight: .heavy)).tracking(2).textCase(.uppercase)
                Spacer()
                Text("\(pool.filter { model.ownedCards.contains($0.id) }.count)/\(pool.count)")
                    .font(.system(size: 12, weight: .bold, design: .rounded)).foregroundStyle(.white.opacity(0.6))
            }
            .foregroundStyle(rarity.color)
            .padding(.horizontal, 4)

            ForEach(pool) { def in cardRow(def) }
        }
    }

    private func cardRow(_ def: CardDef) -> some View {
        let owned = model.ownedCards.contains(def.id)
        let equipped = model.isEquipped(def.id)
        return HStack(spacing: 12) {
            ZStack {
                Circle().fill(Color.black.opacity(0.4)).frame(width: 44, height: 44)
                    .overlay(Circle().strokeBorder(def.rarity.color.opacity(owned ? 0.8 : 0.25), lineWidth: 1))
                Image(systemName: owned ? def.glyph : "questionmark")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(owned ? def.rarity.color : .white.opacity(0.3))
                    .glow(owned ? def.rarity.color : .clear, radius: 5)
            }
            VStack(alignment: .leading, spacing: 3) {
                Text(owned ? def.name : "Undiscovered")
                    .font(.system(size: 15, weight: .semibold)).foregroundStyle(.white)
                Text(owned ? def.blurb : "Open packs to find this card.")
                    .font(.system(size: 12, weight: .medium)).foregroundStyle(.white.opacity(0.65))
                    .fixedSize(horizontal: false, vertical: true)
                if owned { Text(def.flavor).font(.system(size: 11)).italic().foregroundStyle(.white.opacity(0.45)) }
            }
            Spacer(minLength: 4)
            if owned {
                Button { model.toggleEquip(def.id) } label: {
                    Text(equipped ? "Equipped" : "Equip")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundStyle(equipped ? Color.black : .white)
                        .padding(.horizontal, 12).padding(.vertical, 8)
                        .background(RoundedRectangle(cornerRadius: 10)
                            .fill(equipped ? def.rarity.color : Color.white.opacity(0.10)))
                }
                .buttonStyle(.plain)
                .disabled(!equipped && model.equippedCards.count >= model.cardSlots)
            }
        }
        .card(accent: owned ? def.rarity.color : .white)
        .opacity(owned ? 1 : 0.7)
    }
}
