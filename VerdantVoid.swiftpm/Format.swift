import SwiftUI

/// Compact number formatting for large incremental-game values.
/// 1234 -> "1.23K", 1_000_000 -> "1.00M", huge -> "1.23e45".
func fmt(_ value: Double) -> String {
    if value.isNaN { return "0" }
    if value.isInfinite { return "∞" }
    if value < 0 { return "-" + fmt(-value) }
    if value < 1000 {
        if value == value.rounded() { return String(format: "%.0f", value) }
        return String(format: "%.1f", value)
    }
    let suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "UDc", "DDc", "TDc"]
    let exp = Int(floor(log10(value) / 3.0))
    if exp >= 1 && exp < suffixes.count {
        let scaled = value / pow(1000.0, Double(exp))
        return String(format: "%.2f%@", scaled, suffixes[exp])
    }
    return String(format: "%.2e", value)
}

/// Whole-number formatting for counts (no decimal suffix below 1000).
func fmtCount(_ value: Double) -> String {
    if value < 1000 { return String(format: "%.0f", value.rounded(.down)) }
    return fmt(value)
}

/// Human readable duration, e.g. "2h 13m" or "45s".
func fmtTime(_ seconds: Double) -> String {
    if seconds < 1 { return "0s" }
    let s = Int(seconds)
    let h = s / 3600
    let m = (s % 3600) / 60
    let sec = s % 60
    if h > 0 { return "\(h)h \(m)m" }
    if m > 0 { return "\(m)m \(sec)s" }
    return "\(sec)s"
}
