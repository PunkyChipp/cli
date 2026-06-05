import SwiftUI

@main
struct AbyssApp: App {
    var body: some Scene {
        WindowGroup {
            WebGameView()
                .ignoresSafeArea()
                .preferredColorScheme(.dark)
                .statusBarHidden(true)
                .persistentSystemOverlays(.hidden)
        }
    }
}
