import { PermissionsBitField } from "discord.js";
import { replyEmbed } from "../../utils/embeds.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";

export default {
    name: "appealschannel",
    aliases: ["appealchannel"],
    async execute(message) {
        if (!message.guild) return;
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return replyEmbed(message, { type: "error", title: "⛔ Permission Denied", description: "You need **Manage Server**." });
        }
        const channel = message.mentions.channels.first();
        if (!channel) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "`,appealschannel #channel`" });

        const settings = getGuildSettings(message.guild.id);
        if (settings.appealsChannelId === channel.id) {
            return replyEmbed(message, { type: "info", title: "ℹ️ Already Set", description: `Appeals channel is already set to <#${channel.id}>.` });
        }
        settings.appealsChannelId = channel.id;
        await saveSettings();
        return replyEmbed(message, { type: "success", title: "✅ Appeals Channel Set", description: `Ban appeals will be sent to <#${channel.id}>.\n\nEnable the appeals plugin with \`/plugins enable appeals\`.` });
    }
};
