import SwiftUI

struct ContentView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var model = GameModel()

    var body: some View {
        ZStack {
            AbyssBackground(model: model)

            TabView {
                DiveView()
                    .tabItem { Label("Dive", systemImage: "drop.fill") }
                if model.zone == 0 && (model.ebbs > 0 || model.canEbb) {
                    PearlsView().tabItem { Label("Pearls", systemImage: "circle.circle.fill") }
                }
                if model.zone == 0 && model.maxTide > 0 {
                    MilestonesView().tabItem { Label("Tides", systemImage: "water.waves") }
                }
                if model.hasMilestone(5) || model.zone >= 1 {
                    AutomationView().tabItem { Label("Auto", systemImage: "gearshape.fill") }
                }
                if model.maxTide > 0 || model.zone > 0 {
                    DescentView().tabItem { Label("Descent", systemImage: "arrow.down.to.line") }
                }
                SettingsView().tabItem { Label("Settings", systemImage: "gearshape.2.fill") }
            }
            .tint(model.currentZone.accent)

            if let id = model.pendingUnlocks.first {
                UnlockBanner(info: unlockInfo(id)) {
                    withAnimation(.spring) { if !model.pendingUnlocks.isEmpty { model.pendingUnlocks.removeFirst() } }
                }
                .environment(model)
            }

            if let z = model.pendingDescent {
                DescentTransition(zoneIndex: z) { withAnimation(.easeInOut) { model.pendingDescent = nil } }
                    .transition(.opacity)
            }

            if !model.hasChosenDifficulty {
                DifficultyPicker { d in
                    model.difficulty = d; model.hasChosenDifficulty = true; model.save()
                }.transition(.opacity)
            }
        }
        .environment(model)
        .preferredColorScheme(.dark)
        .onAppear { model.applyOfflineProgress(); model.start() }
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .active: model.applyOfflineProgress(); model.start()
            case .inactive, .background: model.save(); model.stop()
            @unknown default: break
            }
        }
    }
}

// MARK: - Onboarding banners

struct UnlockInfo { let title: String; let message: String; let glyph: String }
func unlockInfo(_ id: String) -> UnlockInfo {
    switch id {
    case "ebb":        return UnlockInfo(title: "Ebb the Tide", message: "You've gathered enough to reset for Pearls — permanent power that survives every reset. Open the Pearls tab.", glyph: "wind")
    case "tide":       return UnlockInfo(title: "Raise the Tide", message: "Spend Lumens on the Tide to boost your tap AND your Plankton. It's the spine of the Shallows — and Plankton make it cheaper.", glyph: "water.waves")
    case "milestone5": return UnlockInfo(title: "First Milestone", message: "Crossing Tide milestones unlocks automation and cross-boosts. Auto-Harvest is now available in the Auto tab.", glyph: "checkmark.seal.fill")
    case "descent":    return UnlockInfo(title: "The Drop-Off", message: "You can Descend to the Twilight Reach — a permanent ×2 and a whole new world of life. See the Descent tab.", glyph: "arrow.down.circle.fill")
    default:           return UnlockInfo(title: "Unlocked", message: "Something new is available.", glyph: "sparkles")
    }
}

struct UnlockBanner: View {
    @Environment(GameModel.self) private var model
    let info: UnlockInfo
    let onDismiss: () -> Void
    var body: some View {
        let accent = model.currentZone.accent
        return ZStack {
            Color.black.opacity(0.55).ignoresSafeArea().onTapGesture(perform: onDismiss)
            VStack(spacing: 16) {
                Image(systemName: info.glyph).font(.system(size: 46, weight: .semibold)).foregroundStyle(accent).glow(accent, radius: 14)
                Text("NEW").font(.system(size: 11, weight: .bold)).tracking(3).foregroundStyle(accent)
                Text(info.title).font(.system(size: 26, weight: .light)).foregroundStyle(.white)
                Text(info.message).font(.system(size: 14)).foregroundStyle(.white.opacity(0.75))
                    .multilineTextAlignment(.center).padding(.horizontal, 12)
                Button(action: onDismiss) {
                    Text("Continue").font(.system(size: 16, weight: .semibold)).foregroundStyle(.black)
                        .padding(.vertical, 12).frame(maxWidth: .infinity)
                        .background(RoundedRectangle(cornerRadius: 14).fill(accent))
                }.buttonStyle(.plain)
            }
            .padding(26)
            .background(RoundedRectangle(cornerRadius: 24).fill(Color(hex: 0x05080f).opacity(0.96)))
            .overlay(RoundedRectangle(cornerRadius: 24).strokeBorder(accent.opacity(0.5), lineWidth: 1))
            .padding(.horizontal, 36).frame(maxWidth: 460)
        }
    }
}

// MARK: - Descent transition

struct DescentTransition: View {
    let zoneIndex: Int
    let onEnter: () -> Void
    @State private var appear = false
    private var z: ZoneDef { Zones.zone(zoneIndex) }

    var body: some View {
        ZStack {
            LinearGradient(colors: z.sky, startPoint: .top, endPoint: .bottom).ignoresSafeArea()
            ForEach(0..<3, id: \.self) { i in
                Circle().strokeBorder(z.accent.opacity(0.5 - Double(i) * 0.13), lineWidth: 2)
                    .frame(width: appear ? 520 + CGFloat(i) * 120 : 80, height: appear ? 520 + CGFloat(i) * 120 : 80)
                    .glow(z.accent, radius: 12).opacity(appear ? 0 : 0.9)
            }
            CreatureView(growth: appear ? 0.9 : 0.2, accent: z.accent, glow2: z.glow2, seed: UInt64(zoneIndex + 1))
                .frame(width: 240, height: 240).scaleEffect(appear ? 1 : 0.6).opacity(appear ? 1 : 0.4)
            VStack(spacing: 10) {
                Spacer()
                Text("DESCENDING").font(.system(size: 12, weight: .semibold)).tracking(4).foregroundStyle(z.accent)
                Text(z.name).font(.system(size: 40, weight: .thin)).foregroundStyle(.white).multilineTextAlignment(.center)
                Text(z.blurb).font(.system(size: 14)).foregroundStyle(.white.opacity(0.75))
                    .multilineTextAlignment(.center).padding(.horizontal, 36)
                Spacer()
                Text("Tap to arrive").font(.system(size: 13, weight: .semibold)).foregroundStyle(.white.opacity(0.6))
                    .padding(.bottom, 60).opacity(appear ? 1 : 0)
            }.opacity(appear ? 1 : 0)
        }
        .contentShape(Rectangle()).onTapGesture(perform: onEnter)
        .onAppear {
            withAnimation(.easeOut(duration: 1.5)) { appear = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.6) { onEnter() }
        }
    }
}

// MARK: - First-run difficulty

struct DifficultyPicker: View {
    let onPick: (Difficulty) -> Void
    var body: some View {
        ZStack {
            LinearGradient(colors: [Color(hex: 0x0a5b86), Color(hex: 0x02060f)], startPoint: .top, endPoint: .bottom).ignoresSafeArea()
            VStack(spacing: 22) {
                Spacer()
                VStack(spacing: 8) {
                    Image(systemName: "drop.circle.fill").font(.system(size: 60)).foregroundStyle(Color(hex: 0x8ff0ff)).glow(Color(hex: 0x8ff0ff), radius: 16)
                    Text("ABYSS").font(.system(size: 44, weight: .thin)).tracking(8).foregroundStyle(.white)
                    Text("Coax light from the deep, and descend.\nChoose your pace — you can change it later.")
                        .font(.system(size: 14)).foregroundStyle(.white.opacity(0.7)).multilineTextAlignment(.center)
                }
                VStack(spacing: 12) {
                    ForEach(Difficulty.allCases) { d in
                        Button { withAnimation { onPick(d) } } label: {
                            HStack(spacing: 14) {
                                Image(systemName: d.glyph).font(.system(size: 22, weight: .semibold)).foregroundStyle(Color(hex: 0x8ff0ff)).frame(width: 34)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(d.label).font(.system(size: 19, weight: .semibold))
                                    Text(d.blurb).font(.system(size: 12)).opacity(0.8).multilineTextAlignment(.leading)
                                }
                                Spacer()
                            }
                            .foregroundStyle(.white).padding(16).frame(maxWidth: .infinity)
                            .background(RoundedRectangle(cornerRadius: 16).fill(Color.white.opacity(0.06)))
                            .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Color(hex: 0x8ff0ff).opacity(0.4), lineWidth: 1))
                        }.buttonStyle(.plain)
                    }
                }.padding(.horizontal, 28)
                Spacer()
            }.frame(maxWidth: 480)
        }
    }
}
