import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";

export default {
    data: {
        name: "ticket_edit",
        description: "Edit the ticket panel (title, text, categories).",
        default_member_permissions: String(PermissionsBitField.Flags.ManageGuild),
        dm_permission: false,
        options: [
            {
                name: "title", description: "Change the ticket panel title.", type: 1,
                options: [{ name: "text", description: "New panel title", type: 3, required: true }],
            },
            {
                name: "text", description: "Change the ticket panel description text.", type: 1,
                options: [{ name: "content", description: "New panel text", type: 3, required: true }],
            },
            {
                name: "add", description: "Add a ticket category button.", type: 1,
                options: [
                    { name: "id", description: "Category ID (e.g. support, report)", type: 3, required: true },
                    { name: "label", description: "Button label text", type: 3, required: true },
                    { name: "style", description: "Button color", type: 3, required: false, choices: [
                        { name: "Blue (Primary)", value: "Primary" },
                        { name: "Grey (Secondary)", value: "Secondary" },
                        { name: "Green (Success)", value: "Success" },
                        { name: "Red (Danger)", value: "Danger" },
                    ]},
                ],
            },
            {
                name: "remove", description: "Remove a ticket category.", type: 1,
                options: [{ name: "id", description: "Category ID to remove", type: 3, required: true }],
            },
            {
                name: "list", description: "List all ticket categories.", type: 1,
            },
        ],
    },
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const settings = getGuildSettings(interaction.guildId);

        if (sub === "title") {
            const title = interaction.options.getString("text").slice(0, 256);
            settings.ticket.panelTitle = title;
            await saveSettings();
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "settings", title: "✅ Updated", description: `Ticket panel title set to: **${title}**` }));
        }

        if (sub === "text") {
            const text = interaction.options.getString("content").slice(0, 3500);
            settings.ticket.panelText = text;
            await saveSettings();
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "settings", title: "✅ Updated", description: "Ticket panel text updated." }));
        }

        if (sub === "add") {
            const id = interaction.options.getString("id").toLowerCase();
            const label = interaction.options.getString("label").slice(0, 80);
            const style = interaction.options.getString("style") || "Primary";

            settings.ticket.categories = settings.ticket.categories || [];
            const exists = settings.ticket.categories.some(c => c.id === id);
            if (exists) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Already Exists", description: `A category with ID \`${id}\` already exists.`, ephemeral: true }));

            settings.ticket.categories.push({ id, label, style });
            await saveSettings();
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "settings", title: "✅ Category Added", description: `Added ticket category **${id}** — "${label}" (${style}).` }));
        }

        if (sub === "remove") {
            const id = interaction.options.getString("id").toLowerCase();
            settings.ticket.categories = (settings.ticket.categories || []).filter(c => c.id !== id);
            await saveSettings();
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "settings", title: "✅ Category Removed", description: `Removed ticket category **${id}** (if it existed).` }));
        }

        if (sub === "list") {
            const cats = settings.ticket.categories || [];
            if (!cats.length) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "info", title: "🎫 Ticket Categories", description: "No ticket categories set." }));
            const lines = cats.map(c => `• **${c.id}** — ${c.label} (${c.style})`);
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "ticket", title: "🎫 Ticket Categories", description: lines.join("\n") }));
        }
    },
};
