import SwiftUI

private struct FloatingGain: Identifiable {
    let id = UUID()
    let text: String
    let x: CGFloat
    let y: CGFloat
}

/// A "+N" label that drifts upward and fades out on appear.
private struct FloatingGainView: View {
    let text: String
    @State private var rise: CGFloat = 0
    @State private var opacity: Double = 1

    var body: some View {
        Text(text)
            .font(.system(.headline, design: .rounded).weight(.bold))
            .foregroundStyle(.white)
            .shadow(radius: 4)
            .offset(y: rise)
            .opacity(opacity)
            .onAppear {
                withAnimation(.easeOut(duration: 0.8)) {
                    rise = -70
                    opacity = 0
                }
            }
    }
}

struct WorldView: View {
    @Environment(GameModel.self) private var model
    @State private var gains: [FloatingGain] = []
    @State private var pulse = false

    var body: some View {
        VStack(spacing: 14) {
            CurrencyBar(model: model)

            // World identity
            VStack(spacing: 4) {
                Text("World \(model.worldIndex + 1)")
                    .font(.system(size: 12, weight: .heavy, design: .rounded))
                    .foregroundStyle(model.currentWorld.accent)
                    .textCase(.uppercase).tracking(2)
                Text(model.currentWorld.name)
                    .font(.system(.title, design: .rounded).weight(.heavy))
                    .foregroundStyle(.white)
                Text(model.currentWorld.blurb)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.white.opacity(0.75))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }

            Spacer(minLength: 0)

            // Tap orb
            GeometryReader { geo in
                ZStack {
                    Circle()
                        .fill(
                            RadialGradient(colors: [model.currentWorld.accent.opacity(0.9),
                                                    model.currentWorld.accent.opacity(0.25)],
                                           center: .center, startRadius: 4, endRadius: 150)
                        )
                        .frame(width: 220, height: 220)
                        .scaleEffect(pulse ? 1.04 : 0.97)
                        .shadow(color: model.currentWorld.accent.opacity(0.6), radius: 30)
                        .overlay(
                            Image(systemName: model.currentWorld.glyph)
                                .font(.system(size: 70, weight: .bold))
                                .foregroundStyle(.white.opacity(0.9))
                        )
                        .position(x: geo.size.width / 2, y: geo.size.height / 2)
                        .contentShape(Circle())
                        .onTapGesture {
                            handleTap(in: geo.size)
                        }

                    ForEach(gains) { g in
                        FloatingGainView(text: g.text)
                            .position(x: g.x, y: g.y)
                    }
                }
            }
            .frame(height: 300)

            Text("Tap to gather  ·  +\(fmt(model.clickValue)) Motes")
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(.white.opacity(0.8))

            Spacer(minLength: 0)

            if model.offlineMotes > 0 {
                offlineBanner
            }
        }
        .padding(.vertical, 8)
        .onAppear {
            withAnimation(.easeInOut(duration: 1.4).repeatForever(autoreverses: true)) {
                pulse = true
            }
        }
    }

    private var offlineBanner: some View {
        HStack(spacing: 10) {
            Image(systemName: "moon.zzz.fill").foregroundStyle(.yellow)
            VStack(alignment: .leading, spacing: 2) {
                Text("Welcome back!").font(.system(.subheadline, design: .rounded).weight(.bold))
                Text("Gathered \(fmt(model.offlineMotes)) Motes over \(fmtTime(model.offlineSeconds)) away.")
                    .font(.system(size: 12, weight: .medium)).opacity(0.85)
            }
            Spacer()
            Button {
                withAnimation { model.offlineMotes = 0 }
            } label: {
                Image(systemName: "xmark.circle.fill").foregroundStyle(.white.opacity(0.7))
            }
        }
        .foregroundStyle(.white)
        .card()
        .padding(.horizontal, 16)
    }

    private func handleTap(in size: CGSize) {
        model.tap()
        let g = FloatingGain(
            text: "+\(fmt(model.clickValue))",
            x: size.width / 2 + CGFloat.random(in: -50...50),
            y: size.height / 2 - 60
        )
        withAnimation(.easeOut(duration: 0.1)) { gains.append(g) }
        // Drift upward then remove.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            withAnimation(.easeOut(duration: 0.2)) {
                gains.removeAll { $0.id == g.id }
            }
        }
    }
}
