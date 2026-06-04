import SwiftUI

private struct Gain: Identifiable {
    let id = UUID(); let text: String; let x: CGFloat; let y: CGFloat; let color: Color
}
private struct GainView: View {
    let text: String; let color: Color
    @State private var rise: CGFloat = 0
    @State private var opacity: Double = 1
    var body: some View {
        Text(text).font(.system(size: 17, weight: .semibold)).foregroundStyle(.white)
            .glow(color, radius: 6).offset(y: rise).opacity(opacity)
            .onAppear { withAnimation(.easeOut(duration: 0.85)) { rise = -80; opacity = 0 } }
    }
}
private struct Ring: Identifiable { let id = UUID(); let x: CGFloat; let y: CGFloat; let color: Color }
private struct RingView: View {
    let color: Color
    @State private var scale: CGFloat = 0.2
    @State private var opacity: Double = 0.8
    var body: some View {
        Circle().strokeBorder(color, lineWidth: 2).frame(width: 120, height: 120)
            .scaleEffect(scale).opacity(opacity).glow(color, radius: 8)
            .onAppear { withAnimation(.easeOut(duration: 0.6)) { scale = 1.4; opacity = 0 } }
    }
}

/// The home screen: the living world you tap, the lifeforms you grow, and the
/// upgrades that boost them — all in one place. The core loop never leaves view.
struct GardenView: View {
    @Environment(GameModel.self) private var model
    @State private var gains: [Gain] = []
    @State private var rings: [Ring] = []

    private var vitality: Double { min(1.0, log10(max(1, model.motesPerSecond) + 10) / 10) }

    private func isVisible(_ index: Int) -> Bool {
        if index == 0 { return true }
        return model.generators[index - 1].bought > 0 || model.generators[index].count > 0
    }

    var body: some View {
        VStack(spacing: 0) {
            CurrencyBar(model: model)
            ScrollView {
                VStack(spacing: 14) {
                    worldHeader
                    tapArea
                    Text("Tap the bloom  ·  +\(fmt(model.clickValue)) Motes")
                        .font(.system(size: 13, weight: .medium)).foregroundStyle(.white.opacity(0.8))
                    SeasonBanner()
                    if model.offlineMotes > 0 { offlineBanner }

                    SectionTitle(text: "Lifeforms", glyph: "leaf.fill")
                    ForEach(Array(model.generators.enumerated()), id: \.element.id) { index, _ in
                        if isVisible(index) { GeneratorRow(index: index) }
                    }

                    SectionTitle(text: "Growth Upgrades", glyph: "arrow.up.circle.fill")
                    ForEach(model.upgrades(for: .motes)) { def in UpgradeRow(def: def) }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
        }
    }

    private var worldHeader: some View {
        VStack(spacing: 3) {
            Text("WORLD \(model.worldIndex + 1)")
                .font(.system(size: 11, weight: .semibold)).tracking(3)
                .foregroundStyle(model.currentWorld.accent)
            Text(model.currentWorld.name)
                .font(.system(size: 26, weight: .light)).foregroundStyle(.white)
            Text(model.currentWorld.blurb)
                .font(.system(size: 12)).foregroundStyle(.white.opacity(0.7))
                .multilineTextAlignment(.center)
        }
        .padding(.top, 4)
    }

    private var tapArea: some View {
        GeometryReader { geo in
            ZStack {
                OrganismView(growth: vitality, accent: model.currentWorld.accent,
                             glow2: model.currentWorld.glow2, seed: UInt64(model.worldIndex + 1))
                ForEach(rings) { r in RingView(color: r.color).position(x: r.x, y: r.y) }
                ForEach(gains) { g in GainView(text: g.text, color: g.color).position(x: g.x, y: g.y) }
            }
            .contentShape(Rectangle())
            .gesture(SpatialTapGesture().onEnded { value in handleTap(at: value.location, in: geo.size) })
        }
        .frame(height: 300)
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
    }

    private func handleTap(at p: CGPoint, in size: CGSize) {
        model.tap()
        let color = model.currentWorld.accent
        let g = Gain(text: "+\(fmt(model.clickValue))",
                     x: min(max(p.x, 30), size.width - 30), y: p.y - 10, color: color)
        gains.append(g)
        rings.append(Ring(x: p.x, y: p.y, color: color))
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.85) { gains.removeAll { $0.id == g.id } }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { if !rings.isEmpty { rings.removeFirst() } }
    }
}
