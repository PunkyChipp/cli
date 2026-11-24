// swift-tools-version: 5.9

// HEARTH — a Swift Playgrounds app. Open the whole "Hearth.swiftpm" folder in
// Swift Playgrounds on iPad (iOS 17+) or in Xcode on a Mac, then press Run.

import PackageDescription
import AppleProductTypes

let package = Package(
    name: "Hearth",
    platforms: [
        .iOS("17.0")
    ],
    products: [
        .iOSApplication(
            name: "Hearth",
            targets: ["AppModule"],
            bundleIdentifier: "com.hearth.cottage",
            teamIdentifier: "",
            displayVersion: "1.0",
            bundleVersion: "1",
            appIcon: .placeholder(icon: .cat),
            accentColor: .presetColor(.orange),
            supportedDeviceFamilies: [
                .pad,
                .phone
            ],
            supportedInterfaceOrientations: [
                .portrait,
                .landscapeRight,
                .landscapeLeft,
                .portraitUpsideDown(.when(deviceFamilies: [.pad]))
            ]
        )
    ],
    targets: [
        .executableTarget(
            name: "AppModule",
            path: "."
        )
    ]
)
