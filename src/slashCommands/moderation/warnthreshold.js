import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";

export default {
    data: {
        name: "warnthreshold",
        description: "Manage automatic actions when a user hits a warning count.",
        default_member_permissions: String(PermissionsBitField.Flags.ModerateMembers),
        dm_permission: false,
        options: [
            {
                name: "add", description: "Add a warn threshold action.", type: 1,
                options: [
                    { name: "count", description: "Warning count to trigger at", type: 4, required: true },
                    { name: "action", description: "Action to take", type: 3, required: true, choices: [
                        { name: "Timeout", value: "timeout" },
                        { name: "Kick", value: "kick" },
                        { name: "Ban", value: "ban" },
                    ]},
                    { name: "minutes", description: "Timeout duration in minutes (only for timeout)", type: 4, required: false },
                ],
            },
            {
                name: "remove", description: "Remove a warn threshold.", type: 1,
                options: [{ name: "count", description: "Warning count to remove threshold for", type: 4, required: true }],
            },
            {
                name: "list", description: "List all warn thresholds.", type: 1,
            },
        ],
    },
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const settings = getGuildSettings(interaction.guildId);

        if (sub === "add") {
            const count = interaction.options.getInteger("count");
            const action = interaction.options.getString("action");
            const time = interaction.options.getInteger("minutes") || 0;

            if (count <= 0) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Invalid", description: "Count must be a positive number.", ephemeral: true }));
            if (action === "timeout" && time <= 0) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Invalid", description: "Timeout requires a `minutes` value.", ephemeral: true }));

            settings.warnThresholds = settings.warnThresholds || [];
            const exists = settings.warnThresholds.some(t => t.count === count);
            if (exists) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "info", title: "ℹ️ Already Exists", description: `A threshold at **${count}** warnings already exists. Remove it first.`, ephemeral: true }));

            settings.warnThresholds.push({ count, action, time });
            await saveSettings();
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "settings", title: "✅ Threshold Added", description: `**${count}** warnings → **${action}**${action === "timeout" ? ` (${time}m)` : ""}.` }));
        }

        if (sub === "remove") {
            const count = interaction.options.getInteger("count");
            settings.warnThresholds = (settings.warnThresholds || []).filter(t => t.count !== count);
            await saveSettings();
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "settings", title: "✅ Threshold Removed", description: `Removed threshold at **${count}** warnings.` }));
        }

        if (sub === "list") {
            const list = (settings.warnThresholds || []).map(t => `**${t.count}** → ${t.action}${t.action === "timeout" ? ` (${t.time}m)` : ""}`);
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "info", title: "⚠️ Warn Thresholds", description: list.length ? list.join("\n") : "No thresholds set." }));
        }
    },
};
