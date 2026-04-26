import { PermissionsBitField } from "discord.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";
import { replyEmbed } from "../../utils/embeds.js";

export default {
    config: true,
    name: "ticket_edit",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return replyEmbed(message, { type: "error", title: "⛔ Permission Needed", description: "You need **Manage Server** to edit the ticket panel." });
        }

        const sub = (args.shift() || "").toLowerCase();
        const settings = getGuildSettings(message.guild.id);

        if (sub === "title") {
            const title = args.join(" ");
            if (!title) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "` ,ticket_edit title <new title>`" });
            settings.ticket.panelTitle = title.slice(0, 256);
            await saveSettings();
            return replyEmbed(message, { type: "settings", title: "✅ Updated", description: "Ticket panel title updated." });
        }

        if (sub === "text") {
            const text = args.join(" ");
            if (!text) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "` ,ticket_edit text <new text>`" });
            settings.ticket.panelText = text.slice(0, 3500);
            await saveSettings();
            return replyEmbed(message, { type: "settings", title: "✅ Updated", description: "Ticket panel text updated." });
        }

        if (sub === "add") {
            const id = (args.shift() || "").toLowerCase();
            if (!id) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "` ,ticket_edit add <id> <label...> [primary|secondary|success|danger]`" });

            const styleMaybe = args[args.length - 1]?.toLowerCase();
            const style =
                ["primary", "secondary", "success", "danger"].includes(styleMaybe) ? styleMaybe : "primary";
            const label = (["primary", "secondary", "success", "danger"].includes(styleMaybe) ? args.slice(0, -1) : args).join(" ");

            if (!label) return replyEmbed(message, { type: "error", title: "❌ Missing Label", description: "You must provide a label." });

            const existing = (settings.ticket.categories || []).some((c) => c.id === id);
            if (existing) return replyEmbed(message, { type: "error", title: "❌ Exists", description: "A category with that id already exists." });

            settings.ticket.categories = settings.ticket.categories || [];
            settings.ticket.categories.push({ id, label: label.slice(0, 80), style: style[0].toUpperCase() + style.slice(1) });

            await saveSettings();
            return replyEmbed(message, { type: "settings", title: "✅ Category Added", description: `Added ticket category **${id}**.` });
        }

        if (sub === "remove") {
            const id = (args.shift() || "").toLowerCase();
            if (!id) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "` ,ticket_edit remove <id>`" });
            settings.ticket.categories = (settings.ticket.categories || []).filter((c) => c.id !== id);
            await saveSettings();
            return replyEmbed(message, { type: "settings", title: "✅ Category Removed", description: `Removed ticket category **${id}** (if it existed).` });
        }

        if (sub === "list") {
            const cats = settings.ticket.categories || [];
            if (!cats.length) return replyEmbed(message, { type: "info", title: "🎫 Ticket Categories", description: "No ticket categories set." });
            const lines = cats.map((c) => `• **${c.id}** — ${c.label} (${c.style})`);
            return replyEmbed(message, { type: "ticket", title: "🎫 Ticket Categories", description: lines.join("\n") });
        }

        return replyEmbed(message, {
            type: "error",
            title: "❌ Usage",
            description:
                "` ,ticket_edit title <new title>`\n" +
                "` ,ticket_edit text <new text>`\n" +
                "` ,ticket_edit add <id> <label...> [primary|secondary|success|danger]`\n" +
                "` ,ticket_edit remove <id>`\n" +
                "` ,ticket_edit list`",
        });
    }
};
