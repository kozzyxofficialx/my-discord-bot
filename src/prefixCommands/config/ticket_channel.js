import { PermissionsBitField } from "discord.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";
import { replyEmbed } from "../../utils/embeds.js";

// Helper imports from ticketUtils? No, building panel is local in KozzyX but I should probably move it to utils.
// buildTicketPanelEmbed and buildTicketPanelComponents were in KozzyX.js
// I need to implement them in ticketUtils.js or embeds.js?
// Let's check ticketUtils.js. I only put createTicketChannel etc.
// I need to add buildTicketPanelComponents and buildTicketPanelEmbed to ticketUtils.js
// For now I will copy them here or update ticketUtils.js.
// Updating ticketUtils.js is better.

import { buildTicketPanelEmbed, buildTicketPanelComponents } from "../../utils/ticketUtils.js";

export default {
    config: true,
    name: "ticket_channel",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return replyEmbed(message, {
                type: "error",
                title: "⛔ Permission Needed",
                description: "You need **Manage Server** to set the ticket panel channel.",
            });
        }
        const ch = message.mentions.channels.first();
        if (!ch || !ch.isTextBased()) {
            return replyEmbed(message, { type: "error", title: "❌ Usage", description: "` ,ticket_channel #channel`" });
        }
        const settings = getGuildSettings(message.guild.id);
        settings.ticketPanelChannelId = ch.id;
        await saveSettings();

        const embed = buildTicketPanelEmbed(message.guild.id);
        const rows = buildTicketPanelComponents(message.guild.id);
        await ch.send({ embeds: [embed], components: rows });

        return replyEmbed(message, {
            type: "ticket",
            title: "✅ Ticket Panel Ready",
            description: `Ticket panel channel set to ${ch} and the panel was posted.`,
        });
    }
};
