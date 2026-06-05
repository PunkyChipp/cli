import SwiftUI
import WebKit

/// Hosts the full Abyss game (HTML5 canvas) inside a native WKWebView so it runs
/// as a real iPad app — fullscreen, with working touch controls and a persistent
/// save (localStorage, kept under a fixed origin via baseURL).
struct WebGameView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let cfg = WKWebViewConfiguration()
        cfg.allowsInlineMediaPlayback = true
        cfg.mediaTypesRequiringUserActionForPlayback = []
        cfg.websiteDataStore = .default()   // persistent storage for the save

        let web = WKWebView(frame: .zero, configuration: cfg)
        web.isOpaque = false
        web.backgroundColor = UIColor(red: 0.008, green: 0.024, blue: 0.06, alpha: 1)
        web.scrollView.isScrollEnabled = false
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.scrollView.maximumZoomScale = 1
        web.scrollView.minimumZoomScale = 1
        if #available(iOS 16.4, *) { web.isInspectable = true }

        // A fixed https origin so localStorage persists between launches.
        web.loadHTMLString(GAME_HTML, baseURL: URL(string: "https://abyss.game/"))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
