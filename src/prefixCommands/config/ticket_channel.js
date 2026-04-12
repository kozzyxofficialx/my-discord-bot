import { PermissionsBitField } from "discord.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";
import { replyEmbed } from "../../utils/embeds.js";
import { buildTicketPanelEmbed, buildTicketPanelComponents } from "../../utils/ticketUtils.js";

export default {
    name: "ticket_channel",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return replyEmbed(message, { type: "error", title: "⛔ Permission Needed", description: "You need **Manage Server** to set the ticket panel channel." });
        }
        const ch = message.mentions.channels.first();
        if (!ch || !ch.isTextBased()) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "`,ticket_channel #channel`" });

        const settings = getGuildSettings(message.guild.id);
        if (settings.ticketPanelChannelId === ch.id) {
            return replyEmbed(message, { type: "info", title: "ℹ️ Already Set", description: `Ticket panel channel is already set to ${ch}.` });
        }
        settings.ticketPanelChannelId = ch.id;
        await saveSettings();

        const embed = buildTicketPanelEmbed(message.guild.id);
        const rows = buildTicketPanelComponents(message.guild.id);
        await ch.send({ embeds: [embed], components: rows });

        return replyEmbed(message, { type: "ticket", title: "✅ Ticket Panel Ready", description: `Ticket panel channel set to ${ch} and the panel was posted.` });
    }
};
