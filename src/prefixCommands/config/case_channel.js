import { PermissionsBitField } from "discord.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";
import { replyEmbed } from "../../utils/embeds.js";

export default {
    config: true,
    name: "case_channel",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return replyEmbed(message, {
                type: "error",
                title: "⛔ Permission Needed",
                description: "You need **Manage Server** to set the case channel.",
            });
        }
        const ch = message.mentions.channels.first();
        if (!ch || !ch.isTextBased()) {
            return replyEmbed(message, { type: "error", title: "❌ Usage", description: "` ,case_channel #channel`" });
        }
        const settings = getGuildSettings(message.guild.id);
        settings.caseChannelId = ch.id;
        await saveSettings();
        return replyEmbed(message, {
            type: "settings",
            title: "✅ Case Channel Set",
            description: `Cases will be posted in ${ch}.`,
        });
    }
};
