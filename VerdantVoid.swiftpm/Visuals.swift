import SwiftUI

// MARK: - Deterministic RNG (stable generated art)

struct SeededRNG {
    var state: UInt64
    init(seed: UInt64) { state = seed == 0 ? 0x9E3779B97F4A7C15 : seed }
    mutating func next() -> UInt64 {
        state = state &* 6364136223846793005 &+ 1442695040888963407
        return state
    }
    mutating func unit() -> Double { Double(next() >> 11) / Double(UInt64(1) << 53) }
}

// MARK: - Canvas helpers (the glowing-ink look)

func neonStroke(_ ctx: GraphicsContext, _ path: Path, color: Color, width: CGFloat, glow: CGFloat = 8) {
    ctx.drawLayer { layer in
        layer.addFilter(.blur(radius: glow))
        layer.stroke(path, with: .color(color.opacity(0.85)), lineWidth: width * 2.0)
    }
    ctx.stroke(path, with: .color(color), style: StrokeStyle(lineWidth: width, lineCap: .round))
}

func softDot(_ ctx: GraphicsContext, center: CGPoint, radius: CGFloat, color: Color, alpha: Double) {
    let rect = CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2)
    ctx.fill(Path(ellipseIn: rect),
             with: .radialGradient(Gradient(colors: [color.opacity(alpha), color.opacity(0)]),
                                   center: center, startRadius: 0, endRadius: radius))
}

// MARK: - The abyss background

/// Full-screen depth scene: a zone-coloured water column with drifting marine
/// snow, god-rays near the surface, slow jellyfish, and a cloud of glowing motes
/// whose count tracks the life you actually own — so your empire is visible.
struct AbyssBackground: View {
    let model: GameModel
    private let snow = Firefly.make(count: 70, seed: 4011)
    private let motes = Firefly.make(count: 80, seed: 90125)
    private let jellies = Firefly.make(count: 4, seed: 7)

    var body: some View {
        TimelineView(.animation) { tl in
            let t = tl.date.timeIntervalSinceReferenceDate
            Canvas { ctx, size in draw(ctx, size, t: t) }
        }
        .ignoresSafeArea()
    }

    private func draw(_ ctx: GraphicsContext, _ size: CGSize, t: Double) {
        let z = model.currentZone
        let w = size.width, h = size.height
        let rect = Path(CGRect(origin: .zero, size: size))
        ctx.fill(rect, with: .linearGradient(Gradient(colors: z.sky),
                                             startPoint: .zero, endPoint: CGPoint(x: 0, y: h)))
        // Deepen toward the bottom.
        ctx.fill(rect, with: .linearGradient(
            Gradient(colors: [Color.clear, Color.black.opacity(0.55)]),
            startPoint: CGPoint(x: 0, y: h * 0.3), endPoint: CGPoint(x: 0, y: h)))

        // God-rays near the surface, fading with depth.
        if z.light > 0.3 {
            for i in 0..<5 {
                let x = w * (0.1 + 0.2 * CGFloat(i)) + CGFloat(sin(t * 0.15 + Double(i))) * 26
                var p = Path()
                p.move(to: CGPoint(x: x, y: -40))
                p.addLine(to: CGPoint(x: x + 60, y: -40))
                p.addLine(to: CGPoint(x: x + 160, y: h * 0.85))
                p.addLine(to: CGPoint(x: x + 40, y: h * 0.85))
                p.closeSubpath()
                ctx.fill(p, with: .linearGradient(
                    Gradient(colors: [z.glow2.opacity(0.10 * z.light), .clear]),
                    startPoint: .zero, endPoint: CGPoint(x: 0, y: h * 0.85)))
            }
        }

        // Empire motes: density scales with what you own this zone.
        let owned = model.zone == 0 ? model.planktonOwned : model.lanternOwned
        let shown = min(motes.count, Int(8 + 10 * log10(Double(owned) + 1) * 3))
        for i in 0..<shown {
            let f = motes[i]
            let px = (f.x + sin(t * f.speed + f.phase) * 0.04).truncatingRemainder(dividingBy: 1)
            let py = (f.y + cos(t * f.speed * 0.6 + f.phase) * 0.05).truncatingRemainder(dividingBy: 1)
            let c = CGPoint(x: CGFloat(px < 0 ? px + 1 : px) * w, y: CGFloat(py < 0 ? py + 1 : py) * h)
            let tw = 0.4 + 0.6 * abs(sin(t * 1.2 + f.phase))
            let col = f.warm ? z.glow2 : z.accent
            softDot(ctx, center: c, radius: CGFloat(f.size) * 3.0, color: col, alpha: 0.45 * tw)
            softDot(ctx, center: c, radius: CGFloat(f.size) * 0.9, color: .white, alpha: 0.5 * tw)
        }

        // Marine snow drifting down.
        for f in snow {
            let drift = (f.y + t * 0.012 * (0.5 + f.speed)).truncatingRemainder(dividingBy: 1)
            let x = (f.x + sin(t * 0.1 + f.phase) * 0.02).truncatingRemainder(dividingBy: 1)
            let c = CGPoint(x: CGFloat(x < 0 ? x + 1 : x) * w, y: CGFloat(drift) * h)
            ctx.fill(Path(ellipseIn: CGRect(x: c.x, y: c.y, width: f.size, height: f.size)),
                     with: .color(.white.opacity(0.18)))
        }

        // Slow jellyfish silhouettes.
        for (i, f) in jellies.enumerated() {
            let x = (f.x + sin(t * 0.05 + f.phase) * 0.06).truncatingRemainder(dividingBy: 1)
            let y = (f.y - t * 0.006 * (0.5 + f.speed)).truncatingRemainder(dividingBy: 1)
            let c = CGPoint(x: CGFloat(x < 0 ? x + 1 : x) * w, y: CGFloat(y < 0 ? y + 1 : y) * h)
            let pulse = 1 + 0.12 * sin(t * 1.1 + Double(i))
            let col = (i % 2 == 0) ? z.accent : z.glow2
            softDot(ctx, center: c, radius: 30 * CGFloat(pulse), color: col, alpha: 0.10)
            softDot(ctx, center: c, radius: 12, color: col, alpha: 0.22)
            // tendrils
            for k in 0..<5 {
                var p = Path()
                let tx = c.x - 12 + CGFloat(k) * 6
                p.move(to: CGPoint(x: tx, y: c.y + 6))
                p.addQuadCurve(to: CGPoint(x: tx + CGFloat(sin(t + Double(k))) * 6, y: c.y + 40),
                               control: CGPoint(x: tx + 8, y: c.y + 22))
                ctx.stroke(p, with: .color(col.opacity(0.18)), lineWidth: 1.5)
            }
        }
    }
}

struct Firefly {
    var x: Double, y: Double, speed: Double, phase: Double, size: Double, warm: Bool
    static func make(count: Int, seed: UInt64) -> [Firefly] {
        var rng = SeededRNG(seed: seed)
        return (0..<count).map { _ in
            Firefly(x: rng.unit(), y: rng.unit(), speed: 0.15 + rng.unit() * 0.5,
                    phase: rng.unit() * 6.2831, size: 1.4 + rng.unit() * 2.6, warm: rng.unit() > 0.5)
        }
    }
}

// MARK: - The central creature (tap target)

/// A pulsing bioluminescent medusa whose size/brightness grows with progress.
struct CreatureView: View {
    let growth: Double
    let accent: Color
    let glow2: Color
    var seed: UInt64 = 7

    var body: some View {
        TimelineView(.animation) { tl in
            let t = tl.date.timeIntervalSinceReferenceDate
            Canvas { ctx, size in draw(ctx, size, t: t) }
        }
    }

    private func draw(_ ctx: GraphicsContext, _ size: CGSize, t: Double) {
        let center = CGPoint(x: size.width / 2, y: size.height / 2)
        let g = max(0.05, min(1.0, growth))
        let arms = 7 + Int(g * 13)
        let maxLen = min(size.width, size.height) * 0.46
        var rng = SeededRNG(seed: seed)
        let pulse = 1 + 0.05 * sin(t * 1.7)

        for i in 0..<arms {
            let ang = Double(i) / Double(arms) * 2 * .pi + rng.unit() * 0.2
            let len = maxLen * CGFloat(0.55 + rng.unit() * 0.45) * CGFloat(pulse)
            let sway = sin(t * (0.5 + rng.unit() * 0.6) + Double(i)) * 0.22
            let a = ang + sway
            let tip = CGPoint(x: center.x + CGFloat(cos(a)) * len, y: center.y + CGFloat(sin(a)) * len)
            let ctrl = CGPoint(x: center.x + CGFloat(cos(a - 0.5)) * len * 0.5,
                               y: center.y + CGFloat(sin(a - 0.5)) * len * 0.5)
            var p = Path(); p.move(to: center); p.addQuadCurve(to: tip, control: ctrl)
            let c = (i % 3 == 0) ? glow2 : accent
            neonStroke(ctx, p, color: c.opacity(0.5 + 0.4 * g), width: 2.0, glow: 6)
            softDot(ctx, center: tip, radius: 6, color: c, alpha: 0.85)
        }
        softDot(ctx, center: center, radius: maxLen * 0.5, color: accent, alpha: 0.20)
        softDot(ctx, center: center, radius: 32 * CGFloat(pulse), color: accent, alpha: 0.6)
        softDot(ctx, center: center, radius: 15 * CGFloat(pulse), color: .white, alpha: 0.9)
    }
}
