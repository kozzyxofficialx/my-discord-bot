import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";

export default {
    data: {
        name: "nickunlock",
        description: "Unlock a user's nickname.",
        default_member_permissions: String(PermissionsBitField.Flags.ManageNicknames),
        dm_permission: false,
        options: [
            { name: "user", description: "User to unlock nickname for", type: 6, required: true },
        ],
    },
    async execute(interaction) {
        const member = interaction.options.getMember("user");
        if (!member) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Error", description: "Could not find that member.", ephemeral: true }));

        const settings = getGuildSettings(interaction.guildId);
        settings.nickLocks = settings.nickLocks || {};
        if (!settings.nickLocks[member.id]) {
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "info", title: "ℹ️ Not Locked", description: `**${member.user.tag}**'s nickname is not locked.`, ephemeral: true }));
        }
        delete settings.nickLocks[member.id];
        await saveSettings();
        return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "settings", title: "🔓 Nickname Unlocked", description: `Unlocked nickname for **${member.user.tag}**.` }));
    },
};
