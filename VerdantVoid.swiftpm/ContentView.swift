import SwiftUI

struct ContentView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var model = GameModel()

    var body: some View {
        ZStack {
            WorldBackground(world: model.currentWorld)
                .animation(.easeInOut(duration: 0.8), value: model.worldIndex)

            TabView {
                WorldView()
                    .tabItem { Label("World", systemImage: model.currentWorld.glyph) }
                GrowView()
                    .tabItem { Label("Grow", systemImage: "leaf.fill") }
                UpgradesView()
                    .tabItem { Label("Upgrades", systemImage: "arrow.up.circle.fill") }
                PrestigeView()
                    .tabItem { Label("Prestige", systemImage: "arrow.triangle.2.circlepath") }
                CosmosView()
                    .tabItem { Label("Cosmos", systemImage: "star.fill") }
                SettingsView()
                    .tabItem { Label("Settings", systemImage: "gearshape.fill") }
            }
            .tint(model.currentWorld.accent)

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

/// First-run difficulty selection.
struct DifficultyPicker: View {
    let onPick: (Difficulty) -> Void

    var body: some View {
        ZStack {
            LinearGradient(colors: [Color(hex: 0x0c1a12), Color(hex: 0x16331f)],
                           startPoint: .top, endPoint: .bottom)
                .ignoresSafeArea()

            VStack(spacing: 22) {
                Spacer()
                VStack(spacing: 8) {
                    Image(systemName: "leaf.circle.fill")
                        .font(.system(size: 64)).foregroundStyle(Color(hex: 0x9be7a6))
                    Text("Verdant Void")
                        .font(.system(size: 36, design: .rounded).weight(.heavy))
                        .foregroundStyle(.white)
                    Text("Seed life across dead worlds.\nChoose your pace — you can change it later.")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.white.opacity(0.7))
                        .multilineTextAlignment(.center)
                }

                VStack(spacing: 12) {
                    ForEach(Difficulty.allCases) { d in
                        Button { withAnimation { onPick(d) } } label: {
                            HStack(spacing: 14) {
                                Image(systemName: d.glyph).font(.system(size: 22, weight: .bold))
                                    .frame(width: 34)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(d.label).font(.system(.title3, design: .rounded).weight(.bold))
                                    Text(d.blurb).font(.system(size: 12, weight: .medium)).opacity(0.8)
                                        .multilineTextAlignment(.leading)
                                }
                                Spacer()
                            }
                            .foregroundStyle(.white)
                            .padding(16)
                            .frame(maxWidth: .infinity)
                            .background(RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(.white.opacity(0.10)))
                            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .strokeBorder(.white.opacity(0.18), lineWidth: 1))
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
