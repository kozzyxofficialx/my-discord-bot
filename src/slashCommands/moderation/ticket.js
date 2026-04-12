import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { getGuildSettings } from "../../utils/database.js";
import { buildTicketPanelEmbed, buildTicketPanelComponents } from "../../utils/ticketUtils.js";

export default {
    data: {
        name: "ticket",
        description: "Post the ticket panel in the configured channel.",
        default_member_permissions: String(PermissionsBitField.Flags.ManageGuild),
        dm_permission: false,
    },
    async execute(interaction) {
        const settings = getGuildSettings(interaction.guildId);
        const target = settings.ticketPanelChannelId
            ? interaction.guild.channels.cache.get(settings.ticketPanelChannelId)
            : interaction.channel;

        if (!target?.isTextBased()) {
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Error", description: "Ticket panel channel not set or invalid. Use `/ticket_channel` first.", ephemeral: true }));
        }
        const embed = buildTicketPanelEmbed(interaction.guildId);
        const rows = buildTicketPanelComponents(interaction.guildId);
        await target.send({ embeds: [embed], components: rows });

        return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "ticket", title: "🎫 Ticket Panel Posted", description: `Posted the ticket panel in ${target}.` }));
    },
};
