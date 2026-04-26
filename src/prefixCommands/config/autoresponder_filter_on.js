import { PermissionsBitField } from "discord.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";
import { replyEmbed } from "../../utils/embeds.js";

export default {
    config: true,
    name: "autoresponder_filter_on",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return replyEmbed(message, { type: "error", title: "⛔ Permission Needed", description: "You need **Manage Server** to change this." });
        }
        const settings = getGuildSettings(message.guild.id);
        settings.autoresponderFilterOn = true;
        await saveSettings();
        return replyEmbed(message, { type: "settings", title: "✅ Filter Enabled", description: "Autoresponder filter is now **ON**." });
    }
};
