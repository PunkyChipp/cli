import SwiftUI

private struct Gain: Identifiable { let id = UUID(); let text: String; let x: CGFloat; let y: CGFloat; let color: Color }
private struct GainView: View {
    let text: String; let color: Color
    @State private var rise: CGFloat = 0
    @State private var op: Double = 1
    var body: some View {
        Text(text).font(.system(size: 18, weight: .bold)).foregroundStyle(.white).glow(color, radius: 6)
            .offset(y: rise).opacity(op)
            .onAppear { withAnimation(.easeOut(duration: 0.9)) { rise = -90; op = 0 } }
    }
}
private struct Ripple: Identifiable { let id = UUID(); let x: CGFloat; let y: CGFloat; let color: Color }
private struct RippleView: View {
    let color: Color
    @State private var s: CGFloat = 0.2
    @State private var op: Double = 0.8
    var body: some View {
        Circle().strokeBorder(color, lineWidth: 2).frame(width: 130, height: 130)
            .scaleEffect(s).opacity(op).glow(color, radius: 8)
            .onAppear { withAnimation(.easeOut(duration: 0.6)) { s = 1.5; op = 0 } }
    }
}

struct DiveView: View {
    @Environment(GameModel.self) private var model
    @State private var gains: [Gain] = []
    @State private var ripples: [Ripple] = []

    private var growth: Double {
        let rate = model.zone == 0 ? model.lumensPerSecond : model.glowPerSecond
        return min(1.0, log10(max(1, rate) + 10) / 9)
    }

    var body: some View {
        let z = model.currentZone
        return VStack(spacing: 0) {
            CurrencyBar(model: model)
            ScrollView {
                VStack(spacing: 14) {
                    header(z)
                    tapStage(z)
                    Text(model.zone == 0
                         ? "Tap the water  ·  +\(fmt(model.tapValue)) Lumens"
                         : "Pulse the dark  ·  +\(fmt(model.pulseValue)) Glow")
                        .font(.system(size: 13, weight: .medium)).foregroundStyle(.white.opacity(0.85))
                    if model.offlineGain > 0 { offlineBanner(z) }

                    if model.zone == 0 {
                        planktonCard(z)
                        tideCard(z)
                    } else {
                        lanternCard(z)
                        lureCard(z)
                    }
                }
                .padding(.horizontal, 16).padding(.bottom, 24)
            }
        }
    }

    private func header(_ z: ZoneDef) -> some View {
        VStack(spacing: 3) {
            Text("DEPTH \(model.zone + 1)").font(.system(size: 11, weight: .semibold)).tracking(3)
                .foregroundStyle(z.accent)
            Text(z.name).font(.system(size: 26, weight: .light)).foregroundStyle(.white)
            Text(z.blurb).font(.system(size: 12)).foregroundStyle(.white.opacity(0.7))
                .multilineTextAlignment(.center)
        }.padding(.top, 4)
    }

    private func tapStage(_ z: ZoneDef) -> some View {
        GeometryReader { geo in
            ZStack {
                CreatureView(growth: growth, accent: z.accent, glow2: z.glow2, seed: UInt64(model.zone + 1))
                ForEach(ripples) { r in RippleView(color: r.color).position(x: r.x, y: r.y) }
                ForEach(gains) { g in GainView(text: g.text, color: g.color).position(x: g.x, y: g.y) }
            }
            .contentShape(Rectangle())
            .gesture(SpatialTapGesture().onEnded { v in handleTap(at: v.location, in: geo.size, z: z) })
        }
        .frame(height: 300)
    }

    private func handleTap(at p: CGPoint, in size: CGSize, z: ZoneDef) {
        let v = model.zone == 0 ? model.tapValue : model.pulseValue
        model.tap()
        let g = Gain(text: "+\(fmt(v))", x: min(max(p.x, 30), size.width - 30), y: p.y - 10, color: z.accent)
        gains.append(g); ripples.append(Ripple(x: p.x, y: p.y, color: z.accent))
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) { gains.removeAll { $0.id == g.id } }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { if !ripples.isEmpty { ripples.removeFirst() } }
    }

    private func offlineBanner(_ z: ZoneDef) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "moon.zzz.fill").foregroundStyle(z.glow2).glow(z.glow2, radius: 4)
            VStack(alignment: .leading, spacing: 2) {
                Text("While you were away").font(.system(size: 14, weight: .semibold))
                Text("Drifted in \(fmt(model.offlineGain)) over \(fmtTime(model.offlineSeconds)).")
                    .font(.system(size: 12)).opacity(0.8)
            }
            Spacer()
            Button { withAnimation { model.offlineGain = 0 } } label: {
                Image(systemName: "xmark.circle.fill").foregroundStyle(.white.opacity(0.6))
            }
        }
        .foregroundStyle(.white).card(accent: z.accent)
    }

    // MARK: World 1 feature cards

    private func planktonCard(_ z: ZoneDef) -> some View {
        FeatureCard(
            title: "Plankton", glyph: "aqi.medium", tint: z.accent,
            countText: "×\(model.planktonOwned)",
            lines: ["Each yields \(fmt(model.planktonYield)) Lumens/s",
                    "Total \(fmt(model.lumensPerSecond))/s"],
            pills: planktonPills(),
            buyTitle: "Buy  ·  \(fmt(model.planktonCost))",
            canBuy: model.lumens >= model.planktonCost, buy: { model.buyPlankton() },
            maxTitle: "Max", canMax: model.lumens >= model.planktonCost, max: { model.buyMaxPlankton() })
    }
    private func planktonPills() -> [BoostPillData] {
        var p: [BoostPillData] = [BoostPillData("Tide ×\(fmt(model.tidePlanktonMult))", Color(hex: 0x7fe4ff))]
        if model.level("shoal") > 0 { p.append(BoostPillData("Shoals ×\(fmt(model.shoalMult))", Color(hex: 0xf5e9ff))) }
        if model.hasMilestone(20) { p.append(BoostPillData("Sunbloom ×1.5", Color(hex: 0xfff2a6))) }
        return p
    }

    private func tideCard(_ z: ZoneDef) -> some View {
        var pills = [BoostPillData("Tap ×\(fmt(model.tideTapMult))", z.accent),
                     BoostPillData("Plankton ×\(fmt(model.tidePlanktonMult))", Color(hex: 0x7fe4ff))]
        if model.hasMilestone(10) {
            pills.append(BoostPillData("Plankton cheapens ×\(fmt(model.planktonTideDiscount))", Color(hex: 0x9be7a6)))
        }
        return FeatureCard(
            title: "Tide", glyph: "water.waves", tint: Color(hex: 0x7fe4ff),
            countText: "Lv \(model.tide)",
            lines: ["Raises tap & Plankton yield", nextMilestoneText()],
            pills: pills,
            buyTitle: "Raise Tide  ·  \(fmt(model.tideCost))",
            canBuy: model.lumens >= model.tideCost, buy: { model.raiseTide() },
            maxTitle: nil, canMax: false, max: {})
    }
    private func nextMilestoneText() -> String {
        if let m = GameModel.milestones.first(where: { $0.id > model.maxTide }) {
            return "Next milestone: Tide \(m.id) — \(m.title)"
        }
        return "All Tide milestones reached"
    }

    // MARK: World 2 feature cards (teaser)

    private func lanternCard(_ z: ZoneDef) -> some View {
        FeatureCard(
            title: "Lanternfish", glyph: "fish.fill", tint: z.accent,
            countText: "×\(model.lanternOwned)",
            lines: ["Each yields \(fmt(model.lanternYield)) Glow/s", "Total \(fmt(model.glowPerSecond))/s"],
            pills: [BoostPillData("Lure ×\(fmt(model.lureMult))", z.glow2)],
            buyTitle: "Lure one  ·  \(fmt(model.lanternCost))",
            canBuy: model.glow >= model.lanternCost, buy: { model.buyLantern() },
            maxTitle: nil, canMax: false, max: {})
    }
    private func lureCard(_ z: ZoneDef) -> some View {
        FeatureCard(
            title: "Lure", glyph: "light.beacon.max.fill", tint: z.glow2,
            countText: "Lv \(model.lure)",
            lines: ["Brightens your pulse & Lanternfish",
                    model.lanternOwned > 0 ? "Lanternfish cheapen the next Lure" : ""],
            pills: [BoostPillData("Pulse +\(fmt(0.6 * Double(model.lure)))", z.accent)],
            buyTitle: "Brighten Lure  ·  \(fmt(model.lureCost))",
            canBuy: model.glow >= model.lureCost, buy: { model.raiseLure() },
            maxTitle: nil, canMax: false, max: {})
    }
}

// MARK: - Reusable feature card

struct BoostPillData: Identifiable { let id = UUID(); let text: String; let color: Color
    init(_ t: String, _ c: Color) { text = t; color = c } }

struct FeatureCard: View {
    let title: String
    let glyph: String
    let tint: Color
    let countText: String
    let lines: [String]
    let pills: [BoostPillData]
    let buyTitle: String
    let canBuy: Bool
    let buy: () -> Void
    let maxTitle: String?
    let canMax: Bool
    let max: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                Image(systemName: glyph).font(.system(size: 22, weight: .bold)).foregroundStyle(tint).frame(width: 30)
                Text(title).font(.system(.headline, design: .rounded).weight(.bold)).foregroundStyle(.white)
                Spacer()
                Text(countText).font(.system(.headline, design: .rounded).weight(.bold)).foregroundStyle(.white.opacity(0.7))
            }
            ForEach(lines.filter { !$0.isEmpty }, id: \.self) { l in
                Text(l).font(.system(size: 12, weight: .medium)).foregroundStyle(.white.opacity(0.65))
            }
            if !pills.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) { ForEach(pills) { BoostPill(text: $0.text, color: $0.color) } }
                }
            }
            HStack(spacing: 10) {
                Button(action: buy) {
                    Text(buyTitle).font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(.white).frame(maxWidth: .infinity).padding(.vertical, 10)
                        .background(RoundedRectangle(cornerRadius: 12).fill(canBuy ? tint.opacity(0.85) : Color.white.opacity(0.08)))
                }
                .buttonStyle(.plain).disabled(!canBuy)
                if let maxTitle {
                    Button(action: max) {
                        Text(maxTitle).font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundStyle(.white).frame(width: 80).padding(.vertical, 10)
                            .background(RoundedRectangle(cornerRadius: 12).fill(canMax ? tint.opacity(0.55) : Color.white.opacity(0.08)))
                    }
                    .buttonStyle(.plain).disabled(!canMax)
                }
            }
        }
        .card(accent: tint)
    }
}
