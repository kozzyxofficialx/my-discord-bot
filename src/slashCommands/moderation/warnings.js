import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { getWarningData } from "../../utils/database.js";

export default {
    data: {
        name: "warnings",
        description: "View a user's warning count.",
        dm_permission: false,
        options: [
            { name: "user", description: "User to check (defaults to yourself)", type: 6, required: false },
        ],
    },
    async execute(interaction) {
        const target = interaction.options.getMember("user") || interaction.member;
        const data = getWarningData(interaction.guildId, target.id);
        if (data.count === 0) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "success", title: "✅ Clean Record", description: `**${target.user.tag}** has no warnings.` }));
        return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "warning", title: "⚠️ Warnings", description: `**${target.user.tag}** has **${data.count}** warning(s).` }));
    },
};
