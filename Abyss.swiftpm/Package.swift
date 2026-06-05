// swift-tools-version: 5.9

// Swift Playgrounds App. Open the enclosing "Abyss.swiftpm" folder with Swift
// Playgrounds on iPad (iOS 17+) or with Xcode on a Mac.

import PackageDescription
import AppleProductTypes

let package = Package(
    name: "Abyss",
    platforms: [
        .iOS("17.0")
    ],
    products: [
        .iOSApplication(
            name: "Abyss",
            targets: ["AppModule"],
            bundleIdentifier: "com.abyss.deep",
            teamIdentifier: "",
            displayVersion: "1.0",
            bundleVersion: "1",
            accentColor: .presetColor(.cyan),
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
