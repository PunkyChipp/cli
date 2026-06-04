import SwiftUI

struct MilestonesView: View {
    @Environment(GameModel.self) private var model
    private let tint = Color(hex: 0x7fe4ff)

    var body: some View {
        VStack(spacing: 0) {
            CurrencyBar(model: model)
            ScrollView {
                VStack(spacing: 14) {
                    header
                    ForEach(GameModel.milestones) { m in row(m) }
                }
                .padding(16)
            }
        }
    }

    private var header: some View {
        VStack(spacing: 6) {
            Text("TIDE MILESTONES").font(.system(size: 12, weight: .semibold)).tracking(3).foregroundStyle(tint)
            Text("Tide \(model.tide)  ·  best \(model.maxTide)")
                .font(.system(size: 22, weight: .semibold)).foregroundStyle(.white)
            Text("Raising the Tide past these levels permanently unlocks new powers and automation across the Shallows.")
                .font(.system(size: 12)).foregroundStyle(.white.opacity(0.65)).multilineTextAlignment(.center)
        }.padding(.top, 4)
    }

    private func row(_ m: Milestone) -> some View {
        let reached = model.maxTide >= m.id
        return HStack(spacing: 12) {
            ZStack {
                Circle().fill(Color.black.opacity(0.4)).frame(width: 46, height: 46)
                    .overlay(Circle().strokeBorder((reached ? tint : .white).opacity(0.35), lineWidth: 1))
                Text("\(m.id)").font(.system(size: 16, weight: .heavy, design: .rounded))
                    .foregroundStyle(reached ? tint : .white.opacity(0.4)).glow(reached ? tint : .clear, radius: 5)
            }
            VStack(alignment: .leading, spacing: 3) {
                Text(m.title).font(.system(size: 15, weight: .semibold)).foregroundStyle(.white)
                Text(m.detail).font(.system(size: 12, weight: .medium)).foregroundStyle(.white.opacity(0.65))
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 4)
            Image(systemName: reached ? "checkmark.circle.fill" : "lock.fill")
                .foregroundStyle(reached ? tint : .white.opacity(0.4)).glow(reached ? tint : .clear, radius: 4)
        }
        .card(accent: reached ? tint : .white).opacity(reached ? 1 : 0.7)
    }
}
