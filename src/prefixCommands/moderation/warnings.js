import { getWarningData } from "../../utils/database.js";
import { replyEmbed } from "../../utils/embeds.js";

export default {
    name: "warnings",
    async execute(message, args) {
        const target = message.mentions.members.first() || message.member;
        const data = getWarningData(message.guild.id, target.id);
        if (data.count === 0) return replyEmbed(message, { type: "success", title: "✅ Clean Record", description: `**${target.user.tag}** has no warnings.` });
        return replyEmbed(message, { type: "warning", title: "⚠️ Warnings", description: `**${target.user.tag}** has **${data.count}** warning(s).` });
    }
};
