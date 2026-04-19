import { PermissionsBitField } from "discord.js";
import { doBan } from "../../utils/moderationUtils.js";
import { replyEmbed } from "../../utils/embeds.js";

export default {
    name: "ban",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return replyEmbed(message, { type: "error", title: "⛔ Permission Needed", description: "You need **Ban Members** permission." });
        }
        const target = message.mentions.users.first();
        const reason = args.slice(1).join(" ") || "No reason provided.";
        if (!target) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "` ,ban @user [reason]`" });
        return doBan(message, target, reason);
    }
};
