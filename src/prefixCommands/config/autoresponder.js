import { PermissionsBitField } from "discord.js";
import { guildAutoresponders, saveAutoresponders } from "../../utils/database.js";
import { replyEmbed } from "../../utils/embeds.js";

export default {
    name: "autoresponder",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return replyEmbed(message, { type: "error", title: "⛔ Permission Needed", description: "You need **Manage Messages** to edit autoresponders." });
        }
        const sub = (args.shift() || "").toLowerCase();
        const list = guildAutoresponders.get(message.guild.id) || [];

        if (sub === "add") {
            const trigger = (args.shift() || "").toLowerCase();
            const response = args.join(" ");
            if (!trigger || !response) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "`,autoresponder add <trigger> <response>`" });
            const exists = list.some(x => x.trigger === trigger);
            if (exists) return replyEmbed(message, { type: "error", title: "❌ Already Exists", description: "That trigger already exists. Remove it first if you want to replace it." });
            list.push({ trigger, response });
            guildAutoresponders.set(message.guild.id, list);
            await saveAutoresponders();
            return replyEmbed(message, { type: "settings", title: "✅ Added", description: `Added autoresponder for \`${trigger}\`.` });
        }

        if (sub === "remove") {
            const trigger = (args.shift() || "").toLowerCase();
            if (!trigger) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "`,autoresponder remove <trigger>`" });
            guildAutoresponders.set(message.guild.id, list.filter(x => x.trigger !== trigger));
            await saveAutoresponders();
            return replyEmbed(message, { type: "settings", title: "✅ Removed", description: `Removed autoresponder for \`${trigger}\` (if it existed).` });
        }

        if (sub === "list") {
            if (!list.length) return replyEmbed(message, { type: "info", title: "🤖 Autoresponders", description: "No autoresponders set for this server." });
            const lines = list.map(x => `• \`${x.trigger}\` → \`${x.response}\``);
            return replyEmbed(message, { type: "autoresponder", title: "🤖 Server Autoresponders", description: lines.join("\n") });
        }

        return replyEmbed(message, { type: "error", title: "❌ Usage", description: "`,autoresponder add/remove/list`" });
    }
};
