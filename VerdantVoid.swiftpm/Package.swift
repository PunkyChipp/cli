// swift-tools-version: 5.9

// WARNING: This is a Swift Playgrounds App project.
// Open the enclosing "VerdantVoid.swiftpm" folder with Swift Playgrounds on iPad (iOS 26)
// or with Xcode on a Mac. Editing this file outside those tools is not recommended.

import PackageDescription
import AppleProductTypes

let package = Package(
    name: "Verdant Void",
    platforms: [
        .iOS("17.0")
    ],
    products: [
        .iOSApplication(
            name: "Verdant Void",
            targets: ["AppModule"],
            bundleIdentifier: "com.verdantvoid.game",
            teamIdentifier: "",
            displayVersion: "1.0",
            bundleVersion: "1",
            appIcon: .placeholder(icon: .gameController),
            accentColor: .presetColor(.green),
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
