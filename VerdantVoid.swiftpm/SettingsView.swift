import SwiftUI

struct SettingsView: View {
    @Environment(GameModel.self) private var model
    @State private var showResetConfirm = false

    var body: some View {
        @Bindable var model = model
        return ScrollView {
            VStack(spacing: 16) {
                // Difficulty
                VStack(alignment: .leading, spacing: 10) {
                    SectionTitle(text: "Game Speed", glyph: "speedometer")
                    Text("Difficulty only changes how fast the world produces. Change it any time.")
                        .font(.system(size: 12, weight: .medium)).foregroundStyle(.white.opacity(0.65))
                    Picker("Difficulty", selection: $model.difficulty) {
                        ForEach(Difficulty.allCases) { d in Text(d.label).tag(d) }
                    }
                    .pickerStyle(.segmented)
                    Text(model.difficulty.blurb)
                        .font(.system(size: 12, weight: .semibold)).foregroundStyle(model.currentWorld.accent)
                }
                .card()

                // Stats
                VStack(alignment: .leading, spacing: 8) {
                    SectionTitle(text: "Statistics", glyph: "chart.bar.fill")
                    statRow("Current world", model.currentWorld.name)
                    statRow("Total taps", fmt(Double(model.totalTaps)))
                    statRow("Blooms", "\(model.blooms)")
                    statRow("Terraforms", "\(model.terraforms)")
                    statRow("Singularities", "\(model.singularities)")
                    statRow("Global multiplier", "×\(fmt(model.globalMult))")
                    statRow("Offline cap", fmtTime(model.offlineCapSeconds))
                }
                .card()

                // Data
                VStack(alignment: .leading, spacing: 10) {
                    SectionTitle(text: "Save Data", glyph: "externaldrive.fill")
                    Text("The game autosaves and continues while you're away (up to the offline cap).")
                        .font(.system(size: 12, weight: .medium)).foregroundStyle(.white.opacity(0.65))
                    Button { model.save() } label: {
                        Label("Save Now", systemImage: "square.and.arrow.down.fill")
                            .font(.system(.subheadline, design: .rounded).weight(.bold))
                            .frame(maxWidth: .infinity).padding(.vertical, 10)
                            .background(RoundedRectangle(cornerRadius: 12).fill(.white.opacity(0.12)))
                    }
                    .buttonStyle(.plain).foregroundStyle(.white)

                    Button(role: .destructive) { showResetConfirm = true } label: {
                        Label("Erase All Progress", systemImage: "trash.fill")
                            .font(.system(.subheadline, design: .rounded).weight(.bold))
                            .frame(maxWidth: .infinity).padding(.vertical, 10)
                            .background(RoundedRectangle(cornerRadius: 12).fill(Color.red.opacity(0.7)))
                    }
                    .buttonStyle(.plain).foregroundStyle(.white)
                }
                .card()

                Text("Verdant Void · an idle incremental\nSeed life across dead worlds.")
                    .font(.system(size: 11, weight: .medium)).foregroundStyle(.white.opacity(0.4))
                    .multilineTextAlignment(.center)
            }
            .padding(16)
        }
        .alert("Erase everything?", isPresented: $showResetConfirm) {
            Button("Erase", role: .destructive) { model.hardReset() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This permanently deletes your save, including all Stardust and tech. There's no undo.")
        }
    }

    private func statRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.system(size: 13, weight: .medium)).foregroundStyle(.white.opacity(0.7))
            Spacer()
            Text(value).font(.system(.subheadline, design: .rounded).weight(.bold))
                .foregroundStyle(.white).monospacedDigit()
        }
    }
}
