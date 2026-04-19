import { PermissionsBitField } from "discord.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";
import { replyEmbed } from "../../utils/embeds.js";

export default {
    name: "ticket_ping",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return replyEmbed(message, { type: "error", title: "⛔ Permission Needed", description: "You need **Manage Server** to set ticket display role." });
        }
        const role = message.mentions.roles.first();
        if (!role) {
            return replyEmbed(message, { type: "error", title: "❌ Usage", description: "` ,ticket_ping @role`" });
        }
        const settings = getGuildSettings(message.guild.id);
        settings.ticket.displayRoleId = role.id;
        await saveSettings();
        return replyEmbed(message, {
            type: "settings",
            title: "✅ Ticket Display Role Set",
            description: `Tickets will display **@${role.name}** (it will **not ping**).`,
        });
    }
};
