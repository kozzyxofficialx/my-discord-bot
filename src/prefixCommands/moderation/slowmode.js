import { PermissionsBitField } from "discord.js";
import { replyEmbed } from "../../utils/embeds.js";

export default {
    name: "slowmode",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return replyEmbed(message, { type: "error", title: "⛔ Permission Needed", description: "You need **Manage Channels** to change slowmode." });
        }
        const targetChannel = message.mentions.channels.first() || message.channel;
        if (!targetChannel || !targetChannel.isTextBased()) return replyEmbed(message, { type: "error", title: "❌ Error", description: "Slowmode can only be set on text channels." });

        const rawArgs = message.mentions.channels.first() ? args.slice(1) : args;
        const amountStr = rawArgs[0];
        if (!amountStr) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "`,slowmode [#channel] <seconds|off>`" });

        let seconds = 0;
        if (amountStr.toLowerCase() !== "off" && amountStr !== "0") {
            seconds = parseInt(amountStr, 10);
            if (!Number.isFinite(seconds) || seconds < 0 || seconds > 21600) {
                return replyEmbed(message, { type: "error", title: "❌ Invalid", description: "Slowmode must be between **0** and **21600** seconds." });
            }
        }
        await targetChannel.setRateLimitPerUser(seconds, `Changed by ${message.author.tag}`);
        return replyEmbed(message, {
            type: "settings",
            title: "⏱️ Slowmode Updated",
            description: seconds === 0 ? `Slowmode disabled in ${targetChannel}.` : `Slowmode set in ${targetChannel} to **${seconds}** seconds.`,
        });
    }
};
