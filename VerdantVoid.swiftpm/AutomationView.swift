import SwiftUI

struct AutomationView: View {
    @Environment(GameModel.self) private var model
    private let tint = Color(hex: 0x9be7a6)

    var body: some View {
        @Bindable var model = model
        let diver = model.level("diver") >= 1
        return VStack(spacing: 0) {
            CurrencyBar(model: model)
            ScrollView {
                VStack(spacing: 14) {
                    Text("Automation is earned. Each chore you master can be handed off — then tuned to your taste.")
                        .font(.system(size: 12)).foregroundStyle(.white.opacity(0.65))
                        .frame(maxWidth: .infinity, alignment: .leading)

                    if model.zone == 0 {
                        toggle("Auto-Harvest", "Taps the water for you, every second.",
                               available: model.hasMilestone(5), unlockHint: "Reach Tide milestone 5.",
                               isOn: $model.autoTap)
                        toggle("Auto-Plankton", "Spends spare Lumens buying Plankton.",
                               available: model.hasMilestone(15), unlockHint: "Reach Tide milestone 15.",
                               isOn: $model.autoPlankton)

                        // Auto-Ebb (with a tunable target)
                        VStack(alignment: .leading, spacing: 10) {
                            HStack(spacing: 12) {
                                Image(systemName: diver ? "gearshape.fill" : "lock.fill")
                                    .foregroundStyle(diver ? tint : .white.opacity(0.4))
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Auto-Ebb").font(.system(.headline, design: .rounded).weight(.bold))
                                    Text(diver ? "Ebbs automatically once it's worth enough Pearls."
                                         : "Locked — buy Pearl Diver in the Pearls tab.")
                                        .font(.system(size: 12, weight: .medium)).foregroundStyle(.white.opacity(0.6))
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                                Spacer()
                                Toggle("", isOn: $model.autoEbb).labelsHidden().disabled(!diver)
                            }
                            if diver && model.autoEbb {
                                HStack {
                                    Text("Ebb when worth ≥ \(model.autoEbbTarget) Pearls")
                                        .font(.system(size: 12, weight: .semibold)).foregroundStyle(.white.opacity(0.8))
                                    Spacer()
                                    Stepper("", value: $model.autoEbbTarget, in: 1...1000).labelsHidden()
                                }
                            }
                        }
                        .foregroundStyle(.white).card().opacity(diver ? 1 : 0.6)
                    } else {
                        toggle("Auto-Pulse", "Pulses the dark for Glow automatically.",
                               available: model.maxLure >= 5, unlockHint: "Reach Lure 5.",
                               isOn: $model.autoPulse)
                        toggle("Auto-Lanternfish", "Spends spare Glow luring Lanternfish.",
                               available: true, unlockHint: "",
                               isOn: $model.autoLantern)
                    }
                }
                .padding(16)
            }
        }
    }

    private func toggle(_ title: String, _ info: String, available: Bool, unlockHint: String, isOn: Binding<Bool>) -> some View {
        HStack(spacing: 12) {
            Image(systemName: available ? "gearshape.fill" : "lock.fill")
                .foregroundStyle(available ? tint : .white.opacity(0.4))
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(.headline, design: .rounded).weight(.bold))
                Text(available ? info : "Locked — \(unlockHint)")
                    .font(.system(size: 12, weight: .medium)).foregroundStyle(.white.opacity(0.6))
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer()
            Toggle("", isOn: isOn).labelsHidden().disabled(!available)
        }
        .foregroundStyle(.white).card().opacity(available ? 1 : 0.6)
    }
}
