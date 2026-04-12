import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";

export default {
    data: {
        name: "ticket_ping",
        description: "Set the role displayed in tickets (won't ping).",
        default_member_permissions: String(PermissionsBitField.Flags.ManageGuild),
        dm_permission: false,
        options: [
            { name: "role", description: "Role to display in tickets", type: 8, required: true },
        ],
    },
    async execute(interaction) {
        const role = interaction.options.getRole("role");
        const settings = getGuildSettings(interaction.guildId);
        if (settings.ticket.displayRoleId === role.id) {
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "info", title: "ℹ️ Already Set", description: `Ticket display role is already set to **@${role.name}**.`, ephemeral: true }));
        }
        settings.ticket.displayRoleId = role.id;
        await saveSettings();
        return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "settings", title: "✅ Ticket Display Role Set", description: `Tickets will display **@${role.name}** (it will **not ping**).` }));
    },
};
