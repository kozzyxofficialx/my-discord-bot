import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";

export default {
    data: {
        name: "nicklock",
        description: "Lock a user's nickname so they can't change it.",
        default_member_permissions: String(PermissionsBitField.Flags.ManageNicknames),
        dm_permission: false,
        options: [
            { name: "user", description: "User to lock nickname for", type: 6, required: true },
        ],
    },
    async execute(interaction) {
        const member = interaction.options.getMember("user");
        if (!member) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Error", description: "Could not find that member.", ephemeral: true }));

        const settings = getGuildSettings(interaction.guildId);
        settings.nickLocks = settings.nickLocks || {};
        if (settings.nickLocks[member.id]) {
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "info", title: "ℹ️ Already Locked", description: `**${member.user.tag}**'s nickname is already locked.`, ephemeral: true }));
        }
        settings.nickLocks[member.id] = member.nickname || member.user.username;
        await saveSettings();
        return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "settings", title: "🔒 Nickname Locked", description: `Locked nickname for **${member.user.tag}**.` }));
    },
};
