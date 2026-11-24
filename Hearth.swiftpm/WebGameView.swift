import SwiftUI
import WebKit

/// Hosts HEARTH (an HTML game) in a native WKWebView so it runs as a real iPad
/// app: fullscreen, keyboard works, and the save (localStorage) persists between
/// launches because the page always loads under the same fixed origin.
struct WebGameView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let cfg = WKWebViewConfiguration()
        cfg.allowsInlineMediaPlayback = true
        cfg.mediaTypesRequiringUserActionForPlayback = []
        cfg.websiteDataStore = .default()          // keeps the save file

        let web = WKWebView(frame: .zero, configuration: cfg)
        web.isOpaque = false
        web.backgroundColor = UIColor(red: 0.11, green: 0.075, blue: 0.05, alpha: 1)
        web.scrollView.isScrollEnabled = false
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.scrollView.keyboardDismissMode = .none
        if #available(iOS 16.4, *) { web.isInspectable = true }

        // A fixed origin so localStorage (the save) survives app restarts.
        web.loadHTMLString(GAME_HTML, baseURL: URL(string: "https://hearth.cottage/"))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
