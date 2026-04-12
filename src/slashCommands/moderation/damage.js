import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { doTimeout } from "../../utils/moderationUtils.js";
import { parseDurationToMs } from "../../utils/helpers.js";

export default {
    data: {
        name: "damage",
        description: "Timeout a user (e.g. 10m, 1h, 1d).",
        default_member_permissions: String(PermissionsBitField.Flags.ModerateMembers),
        dm_permission: false,
        options: [
            { name: "user", description: "User to timeout", type: 6, required: true },
            { name: "time", description: "Duration (e.g. 10m, 1h, 1d)", type: 3, required: true },
        ],
    },
    async execute(interaction) {
        const member = interaction.options.getMember("user");
        const timeArg = interaction.options.getString("time");
        if (!member) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Error", description: "Could not find that member.", ephemeral: true }));
        const ms = parseDurationToMs(timeArg);
        if (ms === null || ms === 0) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Invalid Time", description: "Time must be like `10m`, `1h`, `1d`.", ephemeral: true }));
        return doTimeout(interaction, member, ms);
    },
};
