import SwiftUI

struct ContentView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var model = GameModel()

    var body: some View {
        ZStack {
            LivingBackground(model: model)

            TabView {
                GardenView()
                    .tabItem { Label("Garden", systemImage: "leaf.fill") }
                if model.rootWebUnlocked {
                    RootWebView()
                        .tabItem { Label("Roots", systemImage: "point.3.connected.trianglepath.dotted") }
                }
                PrestigeView()
                    .tabItem { Label("Ascend", systemImage: "arrow.triangle.2.circlepath") }
                if model.cardsUnlocked {
                    CosmosView()
                        .tabItem { Label("Cosmos", systemImage: "star.fill") }
                }
                CodexView()
                    .tabItem { Label("Codex", systemImage: "book.fill") }
            }
            .tint(model.currentWorld.accent)

            DiscoveryToast()
                .environment(model)
                .allowsHitTesting(false)

            if let id = model.pendingUnlocks.first {
                UnlockBanner(info: unlockInfo(id)) {
                    withAnimation(.spring) {
                        if !model.pendingUnlocks.isEmpty { model.pendingUnlocks.removeFirst() }
                    }
                }
                .environment(model)
                .transition(.opacity)
            }

            if let arrival = model.pendingWorldArrival {
                WorldArrivalView(worldIndex: arrival) {
                    withAnimation(.easeInOut) { model.pendingWorldArrival = nil }
                }
                .transition(.opacity)
            }

            if !model.hasChosenDifficulty {
                DifficultyPicker { chosen in
                    model.difficulty = chosen
                    model.hasChosenDifficulty = true
                    model.save()
                }
                .transition(.opacity)
            }
        }
        .environment(model)
        .preferredColorScheme(.dark)
        .onAppear {
            model.applyOfflineProgress()
            model.start()
        }
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .active:
                model.applyOfflineProgress()
                model.start()
            case .inactive, .background:
                model.save()
                model.stop()
            @unknown default:
                break
            }
        }
    }
}

// MARK: - Discovery toast (driven by the game clock; never gets stuck)

/// Slide-up banner announcing a newly discovered Journal entry. Its lifetime is
/// owned by the model's tick loop via `activeToast`, so view churn can't strand it.
struct DiscoveryToast: View {
    @Environment(GameModel.self) private var model

    var body: some View {
        VStack {
            Spacer()
            if let id = model.activeToast, let entry = Journal.entry(id) {
                HStack(spacing: 12) {
                    Image(systemName: "sparkles").font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(model.currentWorld.accent)
                        .glow(model.currentWorld.accent, radius: 6)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Discovered").font(.system(size: 11, weight: .semibold))
                            .tracking(2).textCase(.uppercase).foregroundStyle(.white.opacity(0.6))
                        Text(entry.title).font(.system(size: 16, weight: .semibold)).foregroundStyle(.white)
                    }
                    Spacer()
                }
                .padding(14)
                .background(RoundedRectangle(cornerRadius: 16).fill(Color.black.opacity(0.7)))
                .overlay(RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(model.currentWorld.accent.opacity(0.6), lineWidth: 1))
                .padding(.horizontal, 24)
                .padding(.bottom, 90)
                .id(id)
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.spring, value: model.activeToast)
    }
}

// MARK: - System-unlock banner (gradual onboarding)

struct UnlockInfo { let title: String; let message: String; let glyph: String }

func unlockInfo(_ id: String) -> UnlockInfo {
    switch id {
    case "ascend":    return UnlockInfo(title: "You can Bloom", message: "Cash in this run for Pollen — a permanent boost that carries forward. Open the Ascend tab.", glyph: "circle.grid.cross.fill")
    case "roots":     return UnlockInfo(title: "The Root Web", message: "A living lattice beneath the world. Plant nodes, balance Water, and multiply everything. See the new Roots tab.", glyph: "point.3.connected.trianglepath.dotted")
    case "terraform": return UnlockInfo(title: "Terraform ready", message: "You can wake a fresh dead world and gain Biomass. Ascend → Terraform.", glyph: "globe.americas.fill")
    case "cosmos":    return UnlockInfo(title: "The Cosmos opens", message: "Stardust, permanent tech and automation now live in the Cosmos tab.", glyph: "star.fill")
    case "cards":     return UnlockInfo(title: "The Spore Codex", message: "Collect and equip living cards for build-defining bonuses. Cosmos → Spore Codex.", glyph: "rectangle.stack.fill")
    default:          return UnlockInfo(title: "Unlocked", message: "A new system is available.", glyph: "sparkles")
    }
}

struct UnlockBanner: View {
    @Environment(GameModel.self) private var model
    let info: UnlockInfo
    let onDismiss: () -> Void

    var body: some View {
        let accent = model.currentWorld.accent
        return ZStack {
            Color.black.opacity(0.55).ignoresSafeArea()
                .onTapGesture(perform: onDismiss)
            VStack(spacing: 16) {
                Image(systemName: info.glyph).font(.system(size: 46, weight: .semibold))
                    .foregroundStyle(accent).glow(accent, radius: 14)
                Text("NEW").font(.system(size: 11, weight: .bold)).tracking(3).foregroundStyle(accent)
                Text(info.title).font(.system(size: 26, weight: .light)).foregroundStyle(.white)
                Text(info.message).font(.system(size: 14)).foregroundStyle(.white.opacity(0.75))
                    .multilineTextAlignment(.center).padding(.horizontal, 12)
                Button(action: onDismiss) {
                    Text("Continue").font(.system(size: 16, weight: .semibold)).foregroundStyle(.black)
                        .padding(.vertical, 12).frame(maxWidth: .infinity)
                        .background(RoundedRectangle(cornerRadius: 14).fill(accent))
                }
                .buttonStyle(.plain)
            }
            .padding(26)
            .background(RoundedRectangle(cornerRadius: 24).fill(Color(hex: 0x0a0f10).opacity(0.96)))
            .overlay(RoundedRectangle(cornerRadius: 24).strokeBorder(accent.opacity(0.5), lineWidth: 1))
            .padding(.horizontal, 36)
            .frame(maxWidth: 460)
        }
    }
}

// MARK: - World arrival "journey" transition

/// A full-screen reveal played when you Terraform into a new world: the new
/// biome's colours wash in around a blooming organism. Tap (or wait) to enter.
struct WorldArrivalView: View {
    let worldIndex: Int
    let onEnter: () -> Void

    @State private var appear = false

    private var world: WorldDef { Worlds.world(for: worldIndex) }

    var body: some View {
        ZStack {
            LinearGradient(colors: world.sky, startPoint: .top, endPoint: .bottom)
                .ignoresSafeArea()

            // Expanding rings of the new world's light.
            ForEach(0..<3, id: \.self) { i in
                Circle()
                    .strokeBorder(world.accent.opacity(0.5 - Double(i) * 0.13), lineWidth: 2)
                    .frame(width: appear ? 520 + CGFloat(i) * 120 : 80,
                           height: appear ? 520 + CGFloat(i) * 120 : 80)
                    .glow(world.accent, radius: 12)
                    .opacity(appear ? 0 : 0.9)
            }

            OrganismView(growth: appear ? 0.9 : 0.2, accent: world.accent,
                         glow2: world.glow2, seed: UInt64(worldIndex + 1))
                .frame(width: 240, height: 240)
                .scaleEffect(appear ? 1 : 0.6)
                .opacity(appear ? 1 : 0.4)

            VStack(spacing: 10) {
                Spacer()
                Text(worldIndex == 0 ? "A NEW COSMOS" : "ARRIVING AT WORLD \(worldIndex + 1)")
                    .font(.system(size: 12, weight: .semibold)).tracking(4)
                    .foregroundStyle(world.accent)
                Text(world.name)
                    .font(.system(size: 40, weight: .thin)).foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                Text(world.blurb)
                    .font(.system(size: 14)).foregroundStyle(.white.opacity(0.75))
                    .multilineTextAlignment(.center).padding(.horizontal, 36)
                Spacer()
                Text("Tap to enter")
                    .font(.system(size: 13, weight: .semibold)).foregroundStyle(.white.opacity(0.6))
                    .padding(.bottom, 60).opacity(appear ? 1 : 0)
            }
            .opacity(appear ? 1 : 0)
        }
        .contentShape(Rectangle())
        .onTapGesture(perform: onEnter)
        .onAppear {
            withAnimation(.easeOut(duration: 1.4)) { appear = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.4) { onEnter() }
        }
    }
}

// MARK: - First-run difficulty selection

struct DifficultyPicker: View {
    let onPick: (Difficulty) -> Void

    var body: some View {
        ZStack {
            LinearGradient(colors: [Color(hex: 0x05060a), Color(hex: 0x0a1f14)],
                           startPoint: .top, endPoint: .bottom)
                .ignoresSafeArea()

            VStack(spacing: 22) {
                Spacer()
                VStack(spacing: 8) {
                    Image(systemName: "leaf.circle.fill")
                        .font(.system(size: 60)).foregroundStyle(Color(hex: 0x5fe6c0))
                        .glow(Color(hex: 0x5fe6c0), radius: 16)
                    Text("Verdant Void")
                        .font(.system(size: 38, weight: .light)).foregroundStyle(.white)
                    Text("Seed life across dead worlds.\nChoose your pace — you can change it later.")
                        .font(.system(size: 14)).foregroundStyle(.white.opacity(0.7))
                        .multilineTextAlignment(.center)
                }

                VStack(spacing: 12) {
                    ForEach(Difficulty.allCases) { d in
                        Button { withAnimation { onPick(d) } } label: {
                            HStack(spacing: 14) {
                                Image(systemName: d.glyph).font(.system(size: 22, weight: .semibold))
                                    .foregroundStyle(Color(hex: 0x5fe6c0)).frame(width: 34)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(d.label).font(.system(size: 19, weight: .semibold))
                                    Text(d.blurb).font(.system(size: 12)).opacity(0.8)
                                        .multilineTextAlignment(.leading)
                                }
                                Spacer()
                            }
                            .foregroundStyle(.white)
                            .padding(16).frame(maxWidth: .infinity)
                            .background(RoundedRectangle(cornerRadius: 16).fill(Color.white.opacity(0.06)))
                            .overlay(RoundedRectangle(cornerRadius: 16)
                                .strokeBorder(Color(hex: 0x5fe6c0).opacity(0.4), lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 28)
                Spacer()
            }
            .frame(maxWidth: 480)
        }
    }
}
