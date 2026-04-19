import { PermissionsBitField } from "discord.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";
import { replyEmbed } from "../../utils/embeds.js";

export default {
    name: "warnthreshold",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return replyEmbed(message, { type: "error", title: "⛔ Permission Needed", description: "You need **Timeout Members** permission." });
        }
        const sub = (args[0] || "").toLowerCase();
        const settings = getGuildSettings(message.guild.id);

        if (sub === "add") {
            const count = parseInt(args[1], 10);
            const action = String(args[2] || "").toLowerCase();
            const time = parseInt(args[3] || "0", 10);

            if (!Number.isFinite(count) || count <= 0) return replyEmbed(message, { type: "error", title: "❌ Invalid", description: "Count must be a positive number." });
            if (!["timeout", "kick", "ban"].includes(action)) return replyEmbed(message, { type: "error", title: "❌ Invalid", description: "Action must be timeout/kick/ban." });
            if (action === "timeout" && (!Number.isFinite(time) || time <= 0)) return replyEmbed(message, { type: "error", title: "❌ Invalid", description: "Timeout minutes required." });

            settings.warnThresholds = settings.warnThresholds || [];
            settings.warnThresholds.push({ count, action, time });
            await saveSettings();
            return replyEmbed(message, { type: "settings", title: "✅ Threshold Added", description: "Warn threshold added." });
        }

        if (sub === "remove") {
            const count = parseInt(args[1], 10);
            settings.warnThresholds = (settings.warnThresholds || []).filter((t) => t.count !== count);
            await saveSettings();
            return replyEmbed(message, { type: "settings", title: "✅ Threshold Removed", description: "Warn threshold removed." });
        }

        if (sub === "list") {
            const list = (settings.warnThresholds || []).map((t) => `${t.count} → ${t.action}${t.action === "timeout" ? ` (${t.time}m)` : ""}`);
            return replyEmbed(message, { type: "info", title: "⚠️ Warn Thresholds", description: list.length ? list.join("\n") : "None" });
        }

        return replyEmbed(message, { type: "error", title: "❌ Usage", description: "` ,warnthreshold add/remove/list`" });
    }
};
