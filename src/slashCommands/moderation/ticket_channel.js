import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";
import { buildTicketPanelEmbed, buildTicketPanelComponents } from "../../utils/ticketUtils.js";

export default {
    data: {
        name: "ticket_channel",
        description: "Set the ticket panel channel and post the panel.",
        default_member_permissions: String(PermissionsBitField.Flags.ManageGuild),
        dm_permission: false,
        options: [
            { name: "channel", description: "Channel for the ticket panel", type: 7, required: true },
        ],
    },
    async execute(interaction) {
        const ch = interaction.options.getChannel("channel");
        if (!ch?.isTextBased()) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Error", description: "Must be a text channel.", ephemeral: true }));

        const settings = getGuildSettings(interaction.guildId);
        if (settings.ticketPanelChannelId === ch.id) {
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "info", title: "ℹ️ Already Set", description: `Ticket panel channel is already set to ${ch}.`, ephemeral: true }));
        }
        settings.ticketPanelChannelId = ch.id;
        await saveSettings();

        const embed = buildTicketPanelEmbed(interaction.guildId);
        const rows = buildTicketPanelComponents(interaction.guildId);
        await ch.send({ embeds: [embed], components: rows });

        return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "ticket", title: "✅ Ticket Panel Ready", description: `Ticket panel channel set to ${ch} and the panel was posted.` }));
    },
};
