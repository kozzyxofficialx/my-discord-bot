import { PermissionsBitField } from "discord.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";
import { replyEmbed } from "../../utils/embeds.js";
import { parseDurationToMs } from "../../utils/helpers.js";

export default {
    name: "ticket_close",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return replyEmbed(message, { type: "error", title: "⛔ Permission Needed", description: "You need **Manage Server** to change ticket auto-close." });
        }
        const t = args[0];
        const ms = parseDurationToMs(t);
        if (ms === null) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "`,ticket_close <30m|2h|1d|off>`" });

        const settings = getGuildSettings(message.guild.id);
        if (settings.ticket.autoCloseMs === ms) {
            return replyEmbed(message, { type: "info", title: "ℹ️ Already Set", description: ms === 0 ? "Ticket auto-close is already **disabled**." : `Ticket auto-close is already set to **${t}**.` });
        }
        settings.ticket.autoCloseMs = ms;
        await saveSettings();
        return replyEmbed(message, { type: "settings", title: "⏳ Ticket Auto-Close Updated", description: ms === 0 ? "Ticket auto-close is now **disabled**." : `Ticket auto-close set to **${t}**.` });
    }
};
