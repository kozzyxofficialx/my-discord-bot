import { PermissionsBitField } from "discord.js";
import { getWarningData, saveWarnings } from "../../utils/database.js";
import { replyEmbed, postCase, caseEmbed } from "../../utils/embeds.js";
import { trySendModDM } from "../../utils/moderationUtils.js";

export default {
    name: "clearwarns",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return replyEmbed(message, { type: "error", title: "⛔ Permission Needed", description: "You need **Timeout Members** permission." });
        }
        const target = message.mentions.members.first();
        if (!target) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "`,clearwarns @user`" });

        const data = getWarningData(message.guild.id, target.id);
        data.count = 0;
        data.history.push({ action: "clear", by: message.author.id, at: Date.now() });
        await saveWarnings();
        await trySendModDM({ user: target.user, guild: message.guild, type: "success", title: "✅ Warnings cleared", description: "All warnings in the server were cleared by a moderator.", moderatorTag: message.author.tag, reason: "Warnings cleared." });
        await replyEmbed(message, { type: "success", title: "🧽 Warnings Cleared", description: `Cleared all warnings for **${target.user.tag}**.` });
        await postCase(message.guild, caseEmbed(message.guild.id, "🧽 Warnings Cleared", [`**User:** ${target.user.tag}`, `**By:** ${message.author.tag}`]), message.channel.id);
    }
};
