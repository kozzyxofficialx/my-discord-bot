import { getGuildSettings } from "../../utils/database.js";
import { replyEmbed } from "../../utils/embeds.js";
import { buildTicketPanelEmbed, buildTicketPanelComponents } from "../../utils/ticketUtils.js";

export default {
    name: "ticket",
    async execute(message, args) {
        const settings = getGuildSettings(message.guild.id);
        const target =
            settings.ticketPanelChannelId
                ? message.guild.channels.cache.get(settings.ticketPanelChannelId)
                : message.channel;

        if (!target || !target.isTextBased()) {
            return replyEmbed(message, { type: "error", title: "❌ Error", description: "Ticket panel channel not set or invalid." });
        }
        const embed = buildTicketPanelEmbed(message.guild.id);
        const rows = buildTicketPanelComponents(message.guild.id);
        await target.send({ embeds: [embed], components: rows });

        return replyEmbed(message, {
            type: "ticket",
            title: "🎫 Ticket Panel Posted",
            description: `Posted the ticket panel in ${target}.`,
        });
    }
};
