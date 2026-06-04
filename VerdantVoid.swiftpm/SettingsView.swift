import SwiftUI

struct SettingsView: View {
    @Environment(GameModel.self) private var model
    @State private var showReset = false

    var body: some View {
        @Bindable var model = model
        return ScrollView {
            VStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 10) {
                    SectionTitle(text: "Current", glyph: "speedometer")
                    Text("Difficulty only changes the pace of the dive. Change it any time.")
                        .font(.system(size: 12, weight: .medium)).foregroundStyle(.white.opacity(0.65))
                    Picker("Difficulty", selection: $model.difficulty) {
                        ForEach(Difficulty.allCases) { d in Text(d.label).tag(d) }
                    }.pickerStyle(.segmented)
                    Text(model.difficulty.blurb).font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(model.currentZone.accent)
                }.card()

                VStack(alignment: .leading, spacing: 8) {
                    SectionTitle(text: "Log", glyph: "chart.bar.fill")
                    row("Depth", model.currentZone.name)
                    row("Pressure", "×\(fmt(model.pressureMult))")
                    row("Total taps", fmt(Double(model.totalTaps)))
                    row("Ebbs", "\(model.ebbs)")
                    row("Descents", "\(model.descents)")
                    row("Best Tide", "\(model.maxTide)")
                }.card()

                VStack(alignment: .leading, spacing: 10) {
                    SectionTitle(text: "Save", glyph: "externaldrive.fill")
                    Text("Autosaves, and keeps drifting while you're away (up to 8h).")
                        .font(.system(size: 12, weight: .medium)).foregroundStyle(.white.opacity(0.65))
                    Button { model.save() } label: {
                        Label("Save Now", systemImage: "square.and.arrow.down.fill")
                            .font(.system(.subheadline, design: .rounded).weight(.bold))
                            .frame(maxWidth: .infinity).padding(.vertical, 10)
                            .background(RoundedRectangle(cornerRadius: 12).fill(.white.opacity(0.12)))
                    }.buttonStyle(.plain).foregroundStyle(.white)
                    Button(role: .destructive) { showReset = true } label: {
                        Label("Erase All Progress", systemImage: "trash.fill")
                            .font(.system(.subheadline, design: .rounded).weight(.bold))
                            .frame(maxWidth: .infinity).padding(.vertical, 10)
                            .background(RoundedRectangle(cornerRadius: 12).fill(Color.red.opacity(0.7)))
                    }.buttonStyle(.plain).foregroundStyle(.white)
                }.card()

                Text("Abyss · a deep-sea incremental").font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.white.opacity(0.4))
            }
            .padding(16)
        }
        .alert("Erase everything?", isPresented: $showReset) {
            Button("Erase", role: .destructive) { model.hardReset() }
            Button("Cancel", role: .cancel) {}
        } message: { Text("Permanently deletes your dive. No undo.") }
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.system(size: 13, weight: .medium)).foregroundStyle(.white.opacity(0.7))
            Spacer()
            Text(value).font(.system(.subheadline, design: .rounded).weight(.bold)).foregroundStyle(.white).monospacedDigit()
        }
    }
}
