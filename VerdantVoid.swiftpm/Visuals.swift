import SwiftUI

// MARK: - Deterministic RNG (so generated art is stable frame to frame)

struct SeededRNG {
    var state: UInt64
    init(seed: UInt64) { state = seed == 0 ? 0x9E3779B97F4A7C15 : seed }
    mutating func next() -> UInt64 {
        state = state &* 6364136223846793005 &+ 1442695040888963407
        return state
    }
    /// Uniform double in [0,1).
    mutating func unit() -> Double { Double(next() >> 11) / Double(UInt64(1) << 53) }
}

// MARK: - Canvas drawing helpers (the "glowing ink" look)

/// Strokes a path twice — a wide blurred pass for the glow, a sharp pass on top.
func neonStroke(_ ctx: GraphicsContext, _ path: Path, color: Color, width: CGFloat, glow: CGFloat = 8) {
    ctx.drawLayer { layer in
        layer.addFilter(.blur(radius: glow))
        layer.stroke(path, with: .color(color.opacity(0.85)), lineWidth: width * 2.0)
    }
    ctx.stroke(path, with: .color(color), style: StrokeStyle(lineWidth: width, lineCap: .round))
}

/// A soft radial dot of light.
func softDot(_ ctx: GraphicsContext, center: CGPoint, radius: CGFloat, color: Color, alpha: Double) {
    let rect = CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2)
    ctx.fill(
        Path(ellipseIn: rect),
        with: .radialGradient(
            Gradient(colors: [color.opacity(alpha), color.opacity(0)]),
            center: center, startRadius: 0, endRadius: radius
        )
    )
}

// MARK: - Fireflies

struct Firefly {
    var x: Double, y: Double, speed: Double, phase: Double, size: Double
    var warm: Bool

    static func make(count: Int, seed: UInt64) -> [Firefly] {
        var rng = SeededRNG(seed: seed)
        return (0..<count).map { _ in
            Firefly(x: rng.unit(), y: rng.unit(),
                    speed: 0.15 + rng.unit() * 0.5,
                    phase: rng.unit() * 6.2831,
                    size: 1.4 + rng.unit() * 2.6,
                    warm: rng.unit() > 0.5)
        }
    }
}

// MARK: - Living background

/// The whole-screen animated field: dark gradient dimmed by the season's
/// day/night, drifting fireflies, faint flowing filaments, and a celestial orb
/// that tracks the year. Reads the model at draw-time so it stays in sync.
struct LivingBackground: View {
    let model: GameModel
    private let fireflies = Firefly.make(count: 40, seed: 90125)

    var body: some View {
        TimelineView(.animation) { tl in
            let t = tl.date.timeIntervalSinceReferenceDate
            Canvas { ctx, size in
                let world = model.currentWorld
                let phase = model.yearPhase
                draw(ctx, size, world: world, phase: phase, t: t)
            }
        }
        .ignoresSafeArea()
    }

    private func draw(_ ctx: GraphicsContext, _ size: CGSize, world: WorldDef, phase: Double, t: Double) {
        let w = size.width, h = size.height
        // Day/night ambience: brightest at midday (phase ~0.375), darkest at night.
        let daylight = 0.5 + 0.5 * sin((phase - 0.125) * 2 * .pi) // -? mapped 0..1-ish
        let amb = max(0.0, min(1.0, daylight))

        // Base gradient.
        let base = Path(CGRect(origin: .zero, size: size))
        ctx.fill(base, with: .linearGradient(
            Gradient(colors: [world.sky[0], world.sky[1]]),
            startPoint: .zero, endPoint: CGPoint(x: 0, y: h)))

        // Darken for night.
        ctx.fill(base, with: .color(Color.black.opacity((1 - amb) * 0.45)))

        // Celestial orb tracking the year across the sky.
        let orbX = CGFloat(phase) * w
        let orbY = h * 0.20 - CGFloat(sin(.pi * phase)) * h * 0.10
        let warm = Color(hex: 0xffd86b)
        let cool = world.accent
        let orbColor = warm.blended(with: cool, amount: 1 - amb)
        softDot(ctx, center: CGPoint(x: orbX, y: orbY), radius: 90, color: orbColor, alpha: 0.28 * (0.5 + amb))
        softDot(ctx, center: CGPoint(x: orbX, y: orbY), radius: 22, color: orbColor, alpha: 0.9)

        // Faint flowing filaments (mycelium drifting in the deep).
        for i in 0..<4 {
            var path = Path()
            let baseX = w * (0.15 + 0.23 * CGFloat(i))
            path.move(to: CGPoint(x: baseX, y: h))
            for s in stride(from: 0.0, through: 1.0, by: 0.1) {
                let yy = h * (1 - CGFloat(s))
                let sway = CGFloat(sin(t * 0.3 + Double(i) * 1.7 + s * 4)) * 26
                path.addLine(to: CGPoint(x: baseX + sway, y: yy))
            }
            let c = (i % 2 == 0) ? world.accent : world.glow2
            ctx.drawLayer { layer in
                layer.addFilter(.blur(radius: 10))
                layer.stroke(path, with: .color(c.opacity(0.10)), lineWidth: 6)
            }
        }

        // Fireflies.
        for f in fireflies {
            let px = (f.x + sin(t * f.speed + f.phase) * 0.03)
            let py = (f.y + cos(t * f.speed * 0.7 + f.phase) * 0.04)
            let center = CGPoint(x: CGFloat(px.truncatingRemainder(dividingBy: 1) + (px < 0 ? 1 : 0)) * w,
                                 y: CGFloat(py.truncatingRemainder(dividingBy: 1) + (py < 0 ? 1 : 0)) * h)
            let twinkle = 0.25 + 0.75 * abs(sin(t * 1.3 + f.phase))
            let color = f.warm ? world.glow2 : world.accent
            softDot(ctx, center: center, radius: CGFloat(f.size) * 3.2, color: color, alpha: 0.5 * twinkle)
            softDot(ctx, center: center, radius: CGFloat(f.size), color: .white, alpha: 0.6 * twinkle)
        }
    }
}

// MARK: - The living organism (tap screen centrepiece)

/// A glowing core with radiating, gently swaying filaments. `growth` (0…1)
/// controls how many filaments and how bright — so the organism visibly grows
/// as the player progresses.
struct OrganismView: View {
    let growth: Double
    let accent: Color
    let glow2: Color
    var seed: UInt64 = 7

    var body: some View {
        TimelineView(.animation) { tl in
            let t = tl.date.timeIntervalSinceReferenceDate
            Canvas { ctx, size in
                draw(ctx, size, t: t)
            }
        }
    }

    private func draw(_ ctx: GraphicsContext, _ size: CGSize, t: Double) {
        let center = CGPoint(x: size.width / 2, y: size.height / 2)
        let g = max(0.05, min(1.0, growth))
        let branches = 6 + Int(g * 16)
        let maxLen = min(size.width, size.height) * 0.46
        var rng = SeededRNG(seed: seed)
        let pulse = 1 + 0.04 * sin(t * 1.6)

        for i in 0..<branches {
            let ang = Double(i) / Double(branches) * 2 * .pi + rng.unit() * 0.2
            let len = maxLen * CGFloat(0.55 + rng.unit() * 0.45) * CGFloat(pulse)
            let sway = sin(t * (0.6 + rng.unit() * 0.6) + Double(i)) * 0.18
            let a = ang + sway
            let tip = CGPoint(x: center.x + CGFloat(cos(a)) * len,
                              y: center.y + CGFloat(sin(a)) * len)
            let ctrl = CGPoint(x: center.x + CGFloat(cos(a - 0.4)) * len * 0.55,
                               y: center.y + CGFloat(sin(a - 0.4)) * len * 0.55)
            var path = Path()
            path.move(to: center)
            path.addQuadCurve(to: tip, control: ctrl)
            let c = (i % 3 == 0) ? glow2 : accent
            neonStroke(ctx, path, color: c.opacity(0.55 + 0.4 * g), width: 2.0, glow: 6)
            softDot(ctx, center: tip, radius: 7, color: c, alpha: 0.8)
        }

        // Core.
        softDot(ctx, center: center, radius: maxLen * 0.5, color: accent, alpha: 0.22)
        softDot(ctx, center: center, radius: 34 * CGFloat(pulse), color: accent, alpha: 0.6)
        softDot(ctx, center: center, radius: 16 * CGFloat(pulse), color: .white, alpha: 0.9)
    }
}
