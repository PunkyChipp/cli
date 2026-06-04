import SwiftUI

struct CosmosView: View {
    @Environment(GameModel.self) private var model
    @State private var section = 0   // 0 = tech & automation, 1 = cards

    var body: some View {
        @Bindable var model = model
        return VStack(spacing: 10) {
            CurrencyBar(model: model)

            if model.cardsUnlocked {
                Picker("Section", selection: $section) {
                    Text("Tech").tag(0)
                    Text("Spore Codex").tag(1)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 16)
            }

            if section == 1 && model.cardsUnlocked {
                CardCodexView()
            } else {
                techScroll
            }
        }
    }

    private var techScroll: some View {
        @Bindable var model = model
        return ScrollView {
            VStack(spacing: 14) {
                if model.stardust <= 0 && model.singularities == 0 {
                    lockedNotice
                }

                SectionTitle(text: "Cosmos Tech", glyph: "star.fill")
                ForEach(model.upgrades(for: .stardust)) { def in
                    UpgradeRow(def: def)
                }

                SectionTitle(text: "Automation", glyph: "gearshape.2.fill")
                automationToggle(title: "Auto-Tap", info: "Gathers Motes for you continuously.",
                                 unlockId: "s_autotap", isOn: $model.autoTap)
                automationToggle(title: "Auto-Buy Generators", info: "Spends spare Motes on the cheapest lifeforms.",
                                 unlockId: "s_autogen", isOn: $model.autoBuyGens)
                automationToggle(title: "Auto-Bloom", info: "Blooms automatically once it's worth 5+ Pollen.",
                                 unlockId: "s_autobloom", isOn: $model.autoBloom)
                automationToggle(title: "Auto-Terraform", info: "Terraforms to the next world as soon as possible.",
                                 unlockId: "s_autoterra", isOn: $model.autoTerraform)
            }
            .padding(16)
        }
    }

    private var lockedNotice: some View {
        VStack(spacing: 6) {
            Image(systemName: "lock.fill").font(.title2)
            Text("Reach your first Singularity to earn Stardust and unlock permanent tech, automation & the Spore Codex.")
                .font(.system(size: 13, weight: .medium))
                .multilineTextAlignment(.center)
        }
        .foregroundStyle(.white.opacity(0.7))
        .card()
    }

    private func automationToggle(title: String, info: String, unlockId: String, isOn: Binding<Bool>) -> some View {
        let unlocked = model.unlocked(unlockId)
        return HStack(spacing: 12) {
            Image(systemName: unlocked ? "checkmark.seal.fill" : "lock.fill")
                .foregroundStyle(unlocked ? Currency.stardust.color : .white.opacity(0.4))
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(.headline, design: .rounded).weight(.bold))
                Text(unlocked ? info : "Locked — buy the matching Cosmos tech above.")
                    .font(.system(size: 12, weight: .medium)).foregroundStyle(.white.opacity(0.6))
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer()
            Toggle("", isOn: isOn).labelsHidden().disabled(!unlocked)
        }
        .foregroundStyle(.white)
        .card()
        .opacity(unlocked ? 1 : 0.6)
    }
}
