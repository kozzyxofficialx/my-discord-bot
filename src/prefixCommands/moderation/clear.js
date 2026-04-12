import { PermissionsBitField } from "discord.js";
import { replyEmbed, asEmbedPayload } from "../../utils/embeds.js";

export default {
    name: "clear",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return replyEmbed(message, { type: "error", title: "⛔ Permission Needed", description: "You need **Manage Messages** to clear messages." });
        }
        const amount = parseInt(args[0], 10);
        if (!Number.isFinite(amount) || amount < 1 || amount > 100) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "`,clear <amount>` (1–100)" });

        await message.channel.bulkDelete(amount + 1, true);
        const infoMsg = await message.channel.send(asEmbedPayload({
            guildId: message.guild.id,
            type: "success",
            title: "🧹 Messages Cleared",
            description: `Cleared **${amount}** messages.`,
            footerUser: message.author,
            client: message.client,
        }));
        setTimeout(() => infoMsg.delete().catch(() => {}), 5000);
    }
};
