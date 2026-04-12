import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";

export default {
    data: {
        name: "case_channel",
        description: "Set the channel where moderation cases are posted.",
        default_member_permissions: String(PermissionsBitField.Flags.ManageGuild),
        dm_permission: false,
        options: [
            { name: "channel", description: "Channel for case logs", type: 7, required: true },
        ],
    },
    async execute(interaction) {
        const ch = interaction.options.getChannel("channel");
        if (!ch?.isTextBased()) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Error", description: "Must be a text channel.", ephemeral: true }));

        const settings = getGuildSettings(interaction.guildId);
        if (settings.caseChannelId === ch.id) {
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "info", title: "ℹ️ Already Set", description: `Case channel is already set to ${ch}.`, ephemeral: true }));
        }
        settings.caseChannelId = ch.id;
        await saveSettings();
        return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "settings", title: "✅ Case Channel Set", description: `Cases will be posted in ${ch}.` }));
    },
};
