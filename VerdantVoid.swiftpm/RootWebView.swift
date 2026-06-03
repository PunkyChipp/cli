import SwiftUI

struct RootWebView: View {
    @Environment(GameModel.self) private var model
    @State private var selected: RootNodeKind = .taproot
    @State private var eraser = false

    var body: some View {
        let stats = model.evaluateRootWeb()
        return VStack(spacing: 12) {
            CurrencyBar(model: model)

            ScrollView {
                VStack(spacing: 14) {
                    header(stats)
                    waterBar(stats)
                    board
                    palette
                    info
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 20)
            }
        }
    }

    // MARK: Header

    private func header(_ stats: RootWebStats) -> some View {
        VStack(spacing: 4) {
            Text("THE ROOT WEB").font(.system(size: 12, weight: .semibold)).tracking(3)
                .foregroundStyle(model.currentWorld.accent)
            Text("Balance Water against Nutrients. Cluster wisely. Don't let it wilt.")
                .font(.system(size: 12)).foregroundStyle(.white.opacity(0.65))
                .multilineTextAlignment(.center)
            HStack(spacing: 16) {
                stat("Output", "×\(fmt(stats.prodMult))", Currency.motes.color)
                stat("Sap/s", fmt(model.sapPerSecond), Currency.sap.color)
                stat("Nodes", "\(model.rootNodes.count)/\(rootBoardCount)", .white)
            }
            .padding(.top, 4)
        }
    }

    private func stat(_ label: String, _ value: String, _ color: Color) -> some View {
        VStack(spacing: 1) {
            Text(value).font(.system(size: 15, weight: .semibold)).foregroundStyle(color).monospacedDigit()
            Text(label).font(.system(size: 10)).foregroundStyle(.white.opacity(0.5))
        }
    }

    // MARK: Water budget

    private func waterBar(_ stats: RootWebStats) -> some View {
        let frac = stats.waterBudget > 0 ? min(1.2, stats.waterUsed / stats.waterBudget) : 0
        let barColor: Color = stats.wilting ? Color(hex: 0xff5c6a) : Color(hex: 0x6fd0ff)
        return VStack(alignment: .leading, spacing: 6) {
            HStack {
                Label("Water", systemImage: "drop.fill").font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(barColor)
                Spacer()
                Text("\(fmt(stats.waterUsed)) / \(fmt(stats.waterBudget))")
                    .font(.system(size: 12, weight: .semibold)).foregroundStyle(.white.opacity(0.8)).monospacedDigit()
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.08))
                    Capsule().fill(barColor)
                        .frame(width: geo.size.width * CGFloat(min(1, frac)))
                        .glow(barColor, radius: 6)
                }
            }
            .frame(height: 8)
            if stats.wilting {
                Text("⚠︎ Wilting — Water draw exceeds budget. Output cut to \(Int(stats.health * 100))%. Add a Nodule or uproot something thirsty.")
                    .font(.system(size: 11, weight: .medium)).foregroundStyle(Color(hex: 0xff8a94))
            }
        }
        .card(accent: barColor)
    }

    // MARK: Board

    private var board: some View {
        Color.clear
            .aspectRatio(1, contentMode: .fit)
            .overlay {
                GeometryReader { geo in
                    let side = geo.size.width
                    let cell = side / CGFloat(rootBoardCols)
                    ZStack {
                        TimelineView(.animation) { tl in
                            let t = tl.date.timeIntervalSinceReferenceDate
                            Canvas { ctx, size in drawWeb(ctx, size, t: t) }
                        }
                        // Interactive cells + glyphs.
                        ForEach(0..<rootBoardCount, id: \.self) { idx in
                            cellButton(idx, cell: cell)
                                .position(x: (CGFloat(idx % rootBoardCols) + 0.5) * cell,
                                          y: (CGFloat(idx / rootBoardCols) + 0.5) * cell)
                        }
                    }
                }
            }
    }

    private func cellButton(_ idx: Int, cell: CGFloat) -> some View {
        let kind = model.rootNodes[idx]
        return Button {
            tap(idx)
        } label: {
            ZStack {
                if let kind {
                    Image(systemName: kind.glyph)
                        .font(.system(size: cell * 0.30, weight: .semibold))
                        .foregroundStyle(.white)
                        .glow(kind.color, radius: 6)
                } else {
                    Circle().strokeBorder(Color.white.opacity(0.10), lineWidth: 1)
                        .frame(width: cell * 0.5, height: cell * 0.5)
                }
            }
            .frame(width: cell, height: cell)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func drawWeb(_ ctx: GraphicsContext, _ size: CGSize, t: Double) {
        let cell = size.width / CGFloat(rootBoardCols)
        let stats = model.evaluateRootWeb()
        let health = stats.health
        func center(_ i: Int) -> CGPoint {
            CGPoint(x: (CGFloat(i % rootBoardCols) + 0.5) * cell,
                    y: (CGFloat(i / rootBoardCols) + 0.5) * cell)
        }
        // Connections between adjacent planted nodes.
        for (idx, kind) in model.rootNodes {
            for nb in model.rootNeighbours(idx) where nb > idx && model.rootNodes[nb] != nil {
                let other = model.rootNodes[nb]!
                var path = Path()
                path.move(to: center(idx)); path.addLine(to: center(nb))
                let healthy = kind.color.blended(with: other.color, amount: 0.5)
                let c = healthy.blended(with: Color(hex: 0xff5c6a), amount: 1 - health)
                neonStroke(ctx, path, color: c.opacity(0.7), width: 2, glow: 5)
            }
        }
        // Node halos (pulsing).
        for (idx, kind) in model.rootNodes {
            let pulse = 1 + 0.12 * sin(t * 2 + Double(idx))
            softDot(ctx, center: center(idx), radius: cell * 0.42 * CGFloat(pulse), color: kind.color, alpha: 0.30 * health + 0.1)
            softDot(ctx, center: center(idx), radius: cell * 0.22, color: kind.color, alpha: 0.85)
        }
    }

    // MARK: Palette

    private var palette: some View {
        VStack(spacing: 8) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(RootNodeKind.allCases) { kind in
                        paletteChip(kind)
                    }
                    eraserChip
                }
                .padding(.horizontal, 2)
            }
        }
    }

    private func paletteChip(_ kind: RootNodeKind) -> some View {
        let isSel = !eraser && selected == kind
        let affordable = model.sap >= kind.sapCost
        return Button {
            selected = kind; eraser = false
        } label: {
            VStack(spacing: 3) {
                Image(systemName: kind.glyph).font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(kind.color)
                Text(kind.name).font(.system(size: 11, weight: .semibold)).foregroundStyle(.white)
                Text("\(fmt(kind.sapCost))").font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(affordable ? Currency.sap.color : Color(hex: 0xff8a94))
            }
            .frame(width: 74)
            .padding(.vertical, 10)
            .background(RoundedRectangle(cornerRadius: 12).fill(Color.black.opacity(0.4)))
            .overlay(RoundedRectangle(cornerRadius: 12)
                .strokeBorder(isSel ? kind.color : Color.white.opacity(0.10), lineWidth: isSel ? 2 : 1))
            .glow(isSel ? kind.color : .clear, radius: 6, opacity: 0.5)
        }
        .buttonStyle(.plain)
    }

    private var eraserChip: some View {
        Button { eraser = true } label: {
            VStack(spacing: 3) {
                Image(systemName: "scissors").font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(Color(hex: 0xff8a94))
                Text("Uproot").font(.system(size: 11, weight: .semibold)).foregroundStyle(.white)
                Text("+50%").font(.system(size: 10, weight: .semibold)).foregroundStyle(.white.opacity(0.5))
            }
            .frame(width: 74)
            .padding(.vertical, 10)
            .background(RoundedRectangle(cornerRadius: 12).fill(Color.black.opacity(0.4)))
            .overlay(RoundedRectangle(cornerRadius: 12)
                .strokeBorder(eraser ? Color(hex: 0xff8a94) : Color.white.opacity(0.10), lineWidth: eraser ? 2 : 1))
        }
        .buttonStyle(.plain)
    }

    // MARK: Selected info

    private var info: some View {
        Group {
            if eraser {
                infoCard(title: "Uproot", glyph: "scissors", color: Color(hex: 0xff8a94),
                         text: "Tap any node to remove it and recover half its Sap.")
            } else {
                infoCard(title: selected.name, glyph: selected.glyph, color: selected.color, text: selected.blurb)
            }
        }
    }

    private func infoCard(title: String, glyph: String, color: Color, text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: glyph).font(.system(size: 22, weight: .semibold)).foregroundStyle(color)
                .frame(width: 30)
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.system(size: 16, weight: .semibold)).foregroundStyle(.white)
                Text(text).font(.system(size: 12)).foregroundStyle(.white.opacity(0.7))
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer()
        }
        .card(accent: color)
    }

    // MARK: Interaction

    private func tap(_ cell: Int) {
        if eraser {
            model.uproot(cell)
        } else if model.rootNodes[cell] == nil {
            model.plant(selected, at: cell)
        }
    }
}
