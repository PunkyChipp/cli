import SwiftUI

private struct FloatingGain: Identifiable {
    let id = UUID()
    let text: String
    let x: CGFloat
    let y: CGFloat
    let color: Color
}

/// A glowing "+N" that drifts up and fades.
private struct FloatingGainView: View {
    let text: String
    let color: Color
    @State private var rise: CGFloat = 0
    @State private var opacity: Double = 1
    var body: some View {
        Text(text)
            .font(.system(size: 17, weight: .semibold))
            .foregroundStyle(.white)
            .glow(color, radius: 6)
            .offset(y: rise).opacity(opacity)
            .onAppear { withAnimation(.easeOut(duration: 0.85)) { rise = -80; opacity = 0 } }
    }
}

/// An expanding ring of light emitted on tap.
private struct TapRing: Identifiable {
    let id = UUID(); let x: CGFloat; let y: CGFloat; let color: Color
}
private struct TapRingView: View {
    let color: Color
    @State private var scale: CGFloat = 0.2
    @State private var opacity: Double = 0.8
    var body: some View {
        Circle().strokeBorder(color, lineWidth: 2).frame(width: 120, height: 120)
            .scaleEffect(scale).opacity(opacity).glow(color, radius: 8)
            .onAppear { withAnimation(.easeOut(duration: 0.6)) { scale = 1.4; opacity = 0 } }
    }
}

struct WorldView: View {
    @Environment(GameModel.self) private var model
    @State private var gains: [FloatingGain] = []
    @State private var rings: [TapRing] = []

    private var vitality: Double {
        min(1.0, log10(max(1, model.motesPerSecond) + 10) / 10)
    }

    var body: some View {
        VStack(spacing: 12) {
            CurrencyBar(model: model)

            VStack(spacing: 3) {
                Text("WORLD \(model.worldIndex + 1)")
                    .font(.system(size: 11, weight: .semibold)).tracking(3)
                    .foregroundStyle(model.currentWorld.accent)
                Text(model.currentWorld.name)
                    .font(.system(size: 28, weight: .light)).foregroundStyle(.white)
                Text(model.currentWorld.blurb)
                    .font(.system(size: 13)).foregroundStyle(.white.opacity(0.7))
                    .multilineTextAlignment(.center).padding(.horizontal, 24)
            }

            SeasonBanner()

            Spacer(minLength: 0)

            GeometryReader { geo in
                ZStack {
                    OrganismView(growth: vitality, accent: model.currentWorld.accent,
                                 glow2: model.currentWorld.glow2, seed: UInt64(model.worldIndex + 1))
                    ForEach(rings) { r in TapRingView(color: r.color).position(x: r.x, y: r.y) }
                    ForEach(gains) { g in FloatingGainView(text: g.text, color: g.color).position(x: g.x, y: g.y) }
                }
                .contentShape(Rectangle())
                .gesture(
                    SpatialTapGesture().onEnded { value in
                        handleTap(at: value.location, in: geo.size)
                    }
                )
            }
            .frame(height: 320)

            Text("Tap the bloom  ·  +\(fmt(model.clickValue)) Motes")
                .font(.system(size: 13, weight: .medium)).foregroundStyle(.white.opacity(0.8))

            Spacer(minLength: 0)

            if model.offlineMotes > 0 { offlineBanner }
        }
        .padding(.vertical, 8)
    }

    private var offlineBanner: some View {
        HStack(spacing: 10) {
            Image(systemName: "moon.zzz.fill").foregroundStyle(Color(hex: 0xffe27a)).glow(Color(hex: 0xffe27a), radius: 4)
            VStack(alignment: .leading, spacing: 2) {
                Text("Welcome back").font(.system(size: 14, weight: .semibold))
                Text("Gathered \(fmt(model.offlineMotes)) Motes over \(fmtTime(model.offlineSeconds)) away.")
                    .font(.system(size: 12)).opacity(0.8)
            }
            Spacer()
            Button { withAnimation { model.offlineMotes = 0 } } label: {
                Image(systemName: "xmark.circle.fill").foregroundStyle(.white.opacity(0.6))
            }
        }
        .foregroundStyle(.white)
        .card(accent: model.currentWorld.accent)
        .padding(.horizontal, 16)
    }

    private func handleTap(at p: CGPoint, in size: CGSize) {
        model.tap()
        let color = model.currentWorld.accent
        let g = FloatingGain(text: "+\(fmt(model.clickValue))",
                             x: min(max(p.x, 30), size.width - 30), y: p.y - 10, color: color)
        gains.append(g)
        rings.append(TapRing(x: p.x, y: p.y, color: color))
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.85) {
            gains.removeAll { $0.id == g.id }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            if !rings.isEmpty { rings.removeFirst() }
        }
    }
}

/// Compact indicator of the current season + its bonus + a progress bar.
struct SeasonBanner: View {
    @Environment(GameModel.self) private var model
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: model.seasonGlyph).font(.system(size: 20, weight: .semibold))
                .foregroundStyle(model.seasonColor).glow(model.seasonColor, radius: 5).frame(width: 26)
            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text(model.seasonName).font(.system(size: 15, weight: .semibold)).foregroundStyle(.white)
                    Spacer()
                    Text(fmtTime(model.seasonTimeRemaining))
                        .font(.system(size: 11, weight: .medium)).foregroundStyle(.white.opacity(0.5)).monospacedDigit()
                }
                Text(model.seasonBlurb).font(.system(size: 11)).foregroundStyle(.white.opacity(0.7))
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color.white.opacity(0.08))
                        Capsule().fill(model.seasonColor)
                            .frame(width: geo.size.width * CGFloat(model.seasonProgress))
                    }
                }
                .frame(height: 4)
            }
        }
        .card(accent: model.seasonColor)
        .padding(.horizontal, 16)
    }
}
