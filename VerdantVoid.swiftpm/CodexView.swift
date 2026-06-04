import SwiftUI

/// Folds the Field Journal and Settings into a single tab to keep the navigation
/// tight.
struct CodexView: View {
    @State private var section = 0   // 0 = journal, 1 = settings

    var body: some View {
        VStack(spacing: 10) {
            Picker("Section", selection: $section) {
                Text("Journal").tag(0)
                Text("Settings").tag(1)
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16)
            .padding(.top, 8)

            if section == 0 { JournalView() } else { SettingsView() }
        }
    }
}
