import { PermissionsBitField } from "discord.js";
import { replyEmbed } from "../../utils/embeds.js";

export default {
    name: "lock",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return replyEmbed(message, { type: "error", title: "⛔ Permission Needed", description: "You need **Manage Channels** to lock channels." });
        }
        const targetChannel = message.mentions.channels.first() || message.channel;
        if (!targetChannel || !targetChannel.isTextBased()) return replyEmbed(message, { type: "error", title: "❌ Error", description: "Lock can only be used on text channels." });

        const overwrite = targetChannel.permissionOverwrites.cache.get(message.guild.roles.everyone.id);
        if (overwrite?.deny?.has("SendMessages")) {
            return replyEmbed(message, { type: "info", title: "ℹ️ Already Locked", description: `${targetChannel} is already locked.` });
        }

        const reason = args.slice(targetChannel === message.channel ? 0 : 1).join(" ") || "Channel locked";
        await targetChannel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false }, { reason: `${reason} (by ${message.author.tag})` });
        return replyEmbed(message, { type: "mod", title: "🔒 Channel Locked", description: `Locked ${targetChannel}.\n**Reason:** ${reason}` });
    }
};
