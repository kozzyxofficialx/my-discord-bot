import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";

export default {
    data: {
        name: "appealschannel",
        description: "Set the channel where ban appeals are sent.",
        default_member_permissions: String(PermissionsBitField.Flags.ManageGuild),
        dm_permission: false,
        options: [
            { name: "channel", description: "Channel for ban appeals", type: 7, required: true },
        ],
    },
    async execute(interaction) {
        const ch = interaction.options.getChannel("channel");
        if (!ch?.isTextBased()) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Error", description: "Must be a text channel.", ephemeral: true }));

        const settings = getGuildSettings(interaction.guildId);
        if (settings.appealsChannelId === ch.id) {
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "info", title: "ℹ️ Already Set", description: `Appeals channel is already set to ${ch}.`, ephemeral: true }));
        }
        settings.appealsChannelId = ch.id;
        await saveSettings();
        return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "success", title: "✅ Appeals Channel Set", description: `Ban appeals will be sent to ${ch}.\n\nEnable the appeals plugin with \`/plugins enable appeals\`.` }));
    },
};
