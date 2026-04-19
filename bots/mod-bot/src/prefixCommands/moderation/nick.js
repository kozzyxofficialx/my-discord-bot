import { PermissionsBitField } from "discord.js";
import { replyEmbed } from "../../utils/embeds.js";

export default {
    name: "nick",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
            return replyEmbed(message, { type: "error", title: "⛔ Permission Needed", description: "You need **Manage Nicknames** to change nicknames." });
        }
        const target = message.mentions.members.first();
        if (!target) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "` ,nick @user <new nickname>`" });

        const newNick = args.slice(1).join(" ");
        if (!newNick) return replyEmbed(message, { type: "error", title: "❌ Missing Nickname", description: "You must provide a new nickname." });

        await target.setNickname(newNick, `Changed by ${message.author.tag}`);
        return replyEmbed(message, { type: "mod", title: "✅ Nickname Changed", description: `Changed nickname of **${target.user.tag}** to **${newNick}**.` });
    }
};
