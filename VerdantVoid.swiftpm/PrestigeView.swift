import SwiftUI

struct PrestigeView: View {
    @Environment(GameModel.self) private var model
    @State private var confirmBloom = false
    @State private var confirmTerraform = false
    @State private var confirmSingularity = false

    var body: some View {
        VStack(spacing: 0) {
            CurrencyBar(model: model)
            ScrollView {
                VStack(spacing: 16) {
                    bloomCard
                    if model.blooms > 0 || model.terraforms > 0 || model.biomass > 0 {
                        terraformCard
                    }
                    if model.terraforms > 0 || model.singularities > 0 || model.stardust > 0 {
                        singularityCard
                    }
                }
                .padding(16)
            }
        }
        .alert("Bloom?", isPresented: $confirmBloom) {
            Button("Bloom") { model.bloom() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Reset Motes, generators and Mote upgrades for \(fmt(model.pollenGain)) Pollen.")
        }
        .alert("Terraform to \(Worlds.world(for: model.worldIndex + 1).name)?", isPresented: $confirmTerraform) {
            Button("Terraform") { model.terraform() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Reset the Mote and Pollen layers for \(fmt(model.biomassGain)) Biomass and travel to a new world.")
        }
        .alert("Collapse into a Singularity?", isPresented: $confirmSingularity) {
            Button("Collapse", role: .destructive) { model.singularity() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Reset everything except Stardust for \(fmt(model.stardustGain)) Stardust. The cosmos begins anew.")
        }
    }

    // MARK: Bloom

    private var bloomCard: some View {
        PrestigeCard(
            title: "Bloom",
            currency: .pollen,
            glyph: "circle.grid.cross.fill",
            tagline: "First reset layer",
            description: "Cash in this run for Pollen. Each Pollen permanently boosts all production, and unlocks the Pollen upgrade shop.",
            requirementMet: model.canBloom,
            requirementText: model.canBloom
                ? "Ready — gain \(fmt(model.pollenGain)) Pollen"
                : "Reach 1.00M Motes earned this Bloom (\(fmt(model.motesEarnedThisBloom)) so far)",
            actionTitle: "Bloom for \(fmt(model.pollenGain)) Pollen",
            stat: "Blooms: \(model.blooms)",
            tint: Currency.pollen.color
        ) { confirmBloom = true }
    }

    // MARK: Terraform

    private var terraformCard: some View {
        let next = Worlds.world(for: model.worldIndex + 1)
        return PrestigeCard(
            title: "Terraform",
            currency: .biomass,
            glyph: "globe.americas.fill",
            tagline: "Second reset layer · new world",
            description: "Resets the Mote and Pollen layers, grants Biomass, and carries you to \(next.name). Each world is bigger and more productive than the last.",
            requirementMet: model.canTerraform,
            requirementText: model.canTerraform
                ? "Ready — gain \(fmt(model.biomassGain)) Biomass"
                : "Reach \(fmt(model.terraformReq)) Pollen (have \(fmt(model.pollen)))",
            actionTitle: "Terraform → \(next.name)",
            stat: "Worlds terraformed: \(model.terraforms)",
            tint: Currency.biomass.color
        ) { confirmTerraform = true }
    }

    // MARK: Singularity

    private var singularityCard: some View {
        PrestigeCard(
            title: "Singularity",
            currency: .stardust,
            glyph: "star.fill",
            tagline: "Third reset layer · prestige+",
            description: "Collapse everything — worlds, Pollen, Biomass — into Stardust. Spend it on the permanent Cosmos tech tree and automation that persists forever.",
            requirementMet: model.canSingularity,
            requirementText: model.canSingularity
                ? "Ready — gain \(fmt(model.stardustGain)) Stardust"
                : "Reach \(fmt(model.singularityReq)) Biomass (have \(fmt(model.biomass)))",
            actionTitle: "Collapse for \(fmt(model.stardustGain)) Stardust",
            stat: "Singularities: \(model.singularities)",
            tint: Currency.stardust.color
        ) { confirmSingularity = true }
    }
}

private struct PrestigeCard: View {
    let title: String
    let currency: Currency
    let glyph: String
    let tagline: String
    let description: String
    let requirementMet: Bool
    let requirementText: String
    let actionTitle: String
    let stat: String
    let tint: Color
    let action: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                Image(systemName: glyph)
                    .font(.system(size: 26, weight: .bold))
                    .foregroundStyle(tint)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.system(.title2, design: .rounded).weight(.heavy))
                    Text(tagline).font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundStyle(tint).textCase(.uppercase).tracking(1)
                }
                Spacer()
            }
            .foregroundStyle(.white)

            Text(description)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(.white.opacity(0.7))
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: 6) {
                Image(systemName: requirementMet ? "checkmark.circle.fill" : "lock.fill")
                    .foregroundStyle(requirementMet ? .green : .white.opacity(0.5))
                Text(requirementText)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.85))
            }

            ActionButton(title: actionTitle, glyph: glyph, tint: tint, enabled: requirementMet, action: action)

            Text(stat)
                .font(.system(size: 11, weight: .semibold, design: .rounded))
                .foregroundStyle(.white.opacity(0.5))
        }
        .card()
    }
}
