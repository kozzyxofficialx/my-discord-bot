import { PermissionsBitField } from "discord.js";
import { safeRespond, parseDurationToMs } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";

export default {
    data: {
        name: "ticket_close",
        description: "Set ticket auto-close timer (e.g. 30m, 2h, 1d, off).",
        default_member_permissions: String(PermissionsBitField.Flags.ManageGuild),
        dm_permission: false,
        options: [
            { name: "time", description: "Auto-close duration (30m, 2h, 1d) or 'off' to disable", type: 3, required: true },
        ],
    },
    async execute(interaction) {
        const t = interaction.options.getString("time");
        const ms = parseDurationToMs(t);
        if (ms === null) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Invalid", description: "Use a duration like `30m`, `2h`, `1d`, or `off`.", ephemeral: true }));

        const settings = getGuildSettings(interaction.guildId);
        if (settings.ticket.autoCloseMs === ms) {
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "info", title: "ℹ️ Already Set", description: ms === 0 ? "Ticket auto-close is already **disabled**." : `Ticket auto-close is already set to **${t}**.`, ephemeral: true }));
        }
        settings.ticket.autoCloseMs = ms;
        await saveSettings();
        return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "settings", title: "⏳ Ticket Auto-Close Updated", description: ms === 0 ? "Ticket auto-close is now **disabled**." : `Ticket auto-close set to **${t}**.` }));
    },
};
