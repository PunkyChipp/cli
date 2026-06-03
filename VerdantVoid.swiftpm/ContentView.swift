import SwiftUI

struct ContentView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var model = GameModel()

    var body: some View {
        ZStack {
            LivingBackground(model: model)

            TabView {
                WorldView()
                    .tabItem { Label("World", systemImage: model.currentWorld.glyph) }
                GrowView()
                    .tabItem { Label("Grow", systemImage: "leaf.fill") }
                if model.rootWebUnlocked {
                    RootWebView()
                        .tabItem { Label("Roots", systemImage: "point.3.connected.trianglepath.dotted") }
                }
                UpgradesView()
                    .tabItem { Label("Upgrades", systemImage: "arrow.up.circle.fill") }
                PrestigeView()
                    .tabItem { Label("Prestige", systemImage: "arrow.triangle.2.circlepath") }
                JournalView()
                    .tabItem { Label("Journal", systemImage: "book.fill") }
                CosmosView()
                    .tabItem { Label("Cosmos", systemImage: "star.fill") }
                SettingsView()
                    .tabItem { Label("Settings", systemImage: "gearshape.fill") }
            }
            .tint(model.currentWorld.accent)

            DiscoveryToast()
                .environment(model)
                .allowsHitTesting(false)

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

/// Slide-up banner announcing a newly discovered Journal entry. Drains a queue.
struct DiscoveryToast: View {
    @Environment(GameModel.self) private var model

    var body: some View {
        VStack {
            Spacer()
            if let id = model.newlyDiscovered.first, let entry = Journal.entry(id) {
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
                .onAppear {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2.6) {
                        withAnimation(.spring) {
                            if !model.newlyDiscovered.isEmpty { model.newlyDiscovered.removeFirst() }
                        }
                    }
                }
            }
        }
        .animation(.spring, value: model.newlyDiscovered.first)
    }
}

/// First-run difficulty selection.
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
