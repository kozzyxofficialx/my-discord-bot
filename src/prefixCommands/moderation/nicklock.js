import { getGuildSettings, saveSettings } from "../../utils/database.js";
import { replyEmbed } from "../../utils/embeds.js";

export default {
    name: "nicklock",
    async execute(message, args) {
        const target = message.mentions.members.first();
        if (!target) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "` ,nicklock @user`" });

        const settings = getGuildSettings(message.guild.id);
        settings.nickLocks = settings.nickLocks || {};
        settings.nickLocks[target.id] = target.nickname || target.user.username;
        await saveSettings();
        return replyEmbed(message, { type: "settings", title: "🔒 Nickname Locked", description: `Locked nickname for **${target.user.tag}**.` });
    }
};
