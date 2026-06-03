import SwiftUI

struct JournalView: View {
    @Environment(GameModel.self) private var model

    private var found: Int { model.discovered.count }
    private var total: Int { Journal.all.count }

    var body: some View {
        VStack(spacing: 12) {
            CurrencyBar(model: model)
            ScrollView {
                VStack(spacing: 14) {
                    header
                    ForEach(Journal.all) { entry in
                        row(entry)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 20)
            }
        }
    }

    private var header: some View {
        VStack(spacing: 6) {
            Text("FIELD JOURNAL").font(.system(size: 12, weight: .semibold)).tracking(3)
                .foregroundStyle(model.currentWorld.accent)
            Text("\(found) of \(total) discovered")
                .font(.system(size: 22, weight: .semibold)).foregroundStyle(.white)
            Text("Each discovery permanently boosts all production. Current bonus ×\(fmt(model.journalMult)).")
                .font(.system(size: 12)).foregroundStyle(.white.opacity(0.65))
                .multilineTextAlignment(.center)
        }
        .padding(.top, 4)
    }

    private func row(_ entry: Discovery) -> some View {
        let unlocked = model.discovered.contains(entry.id)
        let accent = model.currentWorld.accent
        return HStack(spacing: 12) {
            ZStack {
                Circle().fill(Color.black.opacity(0.4)).frame(width: 42, height: 42)
                    .overlay(Circle().strokeBorder((unlocked ? accent : .white).opacity(0.3), lineWidth: 1))
                Image(systemName: unlocked ? "leaf.fill" : "questionmark")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(unlocked ? accent : Color.white.opacity(0.35))
                    .glow(unlocked ? accent : .clear, radius: 5)
            }
            VStack(alignment: .leading, spacing: 3) {
                Text(unlocked ? entry.title : "???")
                    .font(.system(size: 15, weight: .semibold)).foregroundStyle(.white)
                Text(unlocked ? entry.flavor : entry.hint)
                    .font(.system(size: 12))
                    .italic(unlocked)
                    .foregroundStyle(.white.opacity(unlocked ? 0.7 : 0.45))
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 4)
            if unlocked {
                Image(systemName: "checkmark.circle.fill").foregroundStyle(accent).glow(accent, radius: 4)
            }
        }
        .card(accent: unlocked ? accent : .white)
        .opacity(unlocked ? 1 : 0.7)
    }
}
