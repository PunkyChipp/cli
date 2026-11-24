import SwiftUI

@main
struct HearthApp: App {
    var body: some Scene {
        WindowGroup {
            WebGameView()
                .ignoresSafeArea(.container)
                .background(Color(red: 0.11, green: 0.075, blue: 0.05))
                .preferredColorScheme(.dark)
                .statusBarHidden(true)
                .persistentSystemOverlays(.hidden)
        }
    }
}
