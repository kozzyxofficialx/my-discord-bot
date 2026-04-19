import { getGuildSettings, saveSettings } from "../../utils/database.js";
import { replyEmbed } from "../../utils/embeds.js";

export default {
    name: "nickunlock",
    async execute(message, args) {
        const target = message.mentions.members.first();
        if (!target) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "` ,nickunlock @user`" });

        const settings = getGuildSettings(message.guild.id);
        settings.nickLocks = settings.nickLocks || {};
        delete settings.nickLocks[target.id];
        await saveSettings();
        return replyEmbed(message, { type: "settings", title: "🔓 Nickname Unlocked", description: `Unlocked nickname for **${target.user.tag}**.` });
    }
};
