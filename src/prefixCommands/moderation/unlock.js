import { PermissionsBitField } from "discord.js";
import { replyEmbed } from "../../utils/embeds.js";

export default {
    name: "unlock",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return replyEmbed(message, { type: "error", title: "⛔ Permission Needed", description: "You need **Manage Channels** to unlock channels." });
        }
        const targetChannel = message.mentions.channels.first() || message.channel;
        if (!targetChannel || !targetChannel.isTextBased()) return replyEmbed(message, { type: "error", title: "❌ Error", description: "Unlock can only be used on text channels." });

        const overwrite = targetChannel.permissionOverwrites.cache.get(message.guild.roles.everyone.id);
        if (!overwrite || !overwrite.deny?.has("SendMessages")) {
            return replyEmbed(message, { type: "info", title: "ℹ️ Not Locked", description: `${targetChannel} is not locked.` });
        }

        await targetChannel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null }, { reason: `Unlocked by ${message.author.tag}` });
        return replyEmbed(message, { type: "mod", title: "🔓 Channel Unlocked", description: `Unlocked ${targetChannel}.` });
    }
};
