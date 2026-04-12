import { PermissionsBitField } from "discord.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";
import { replyEmbed } from "../../utils/embeds.js";

export default {
    name: "autoresponder_filter_off",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return replyEmbed(message, { type: "error", title: "⛔ Permission Needed", description: "You need **Manage Server** to change this." });
        }
        const settings = getGuildSettings(message.guild.id);
        if (settings.autoresponderFilterOn === false) {
            return replyEmbed(message, { type: "info", title: "ℹ️ Already Disabled", description: "Autoresponder filter is already **OFF**." });
        }
        settings.autoresponderFilterOn = false;
        await saveSettings();
        return replyEmbed(message, { type: "settings", title: "✅ Filter Disabled", description: "Autoresponder filter is now **OFF**." });
    }
};
