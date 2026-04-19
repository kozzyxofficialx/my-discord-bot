import { PermissionsBitField } from "discord.js";
import { replyEmbed } from "../../utils/embeds.js";
import { unlockGuild } from "../../utils/raidProtection.js";

export default {
    name: "unraid",
    async execute(message) {
        if (!message.guild) return;
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return replyEmbed(message, { type: "error", title: "⛔ Admin Only", description: "Only admins can lift a raid lockdown." });
        }

        await unlockGuild(message.guild);

        return replyEmbed(message, {
            type: "success",
            title: "✅ Lockdown Lifted",
            description: "The server has been unlocked. @everyone can send messages again.",
        });
    },
};
