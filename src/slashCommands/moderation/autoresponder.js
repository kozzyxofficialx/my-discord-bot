import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { guildAutoresponders, saveAutoresponders } from "../../utils/database.js";

export default {
    data: {
        name: "autoresponder",
        description: "Manage autoresponders for this server.",
        default_member_permissions: String(PermissionsBitField.Flags.ManageMessages),
        dm_permission: false,
        options: [
            {
                name: "add", description: "Add an autoresponder.", type: 1,
                options: [
                    { name: "trigger", description: "Word or phrase to trigger on", type: 3, required: true },
                    { name: "response", description: "Response text (or a single emoji to react)", type: 3, required: true },
                ],
            },
            {
                name: "remove", description: "Remove an autoresponder.", type: 1,
                options: [{ name: "trigger", description: "Trigger to remove", type: 3, required: true }],
            },
            {
                name: "list", description: "List all autoresponders.", type: 1,
            },
        ],
    },
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const list = guildAutoresponders.get(interaction.guildId) || [];

        if (sub === "add") {
            const trigger = interaction.options.getString("trigger").toLowerCase();
            const response = interaction.options.getString("response");

            const exists = list.some(x => x.trigger === trigger);
            if (exists) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Already Exists", description: `Trigger \`${trigger}\` already exists. Remove it first to replace.`, ephemeral: true }));

            list.push({ trigger, response });
            guildAutoresponders.set(interaction.guildId, list);
            await saveAutoresponders();
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "settings", title: "✅ Added", description: `Added autoresponder for \`${trigger}\`.` }));
        }

        if (sub === "remove") {
            const trigger = interaction.options.getString("trigger").toLowerCase();
            const next = list.filter(x => x.trigger !== trigger);
            guildAutoresponders.set(interaction.guildId, next);
            await saveAutoresponders();
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "settings", title: "✅ Removed", description: `Removed autoresponder for \`${trigger}\` (if it existed).` }));
        }

        if (sub === "list") {
            if (!list.length) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "info", title: "🤖 Autoresponders", description: "No autoresponders set for this server." }));
            const lines = list.map(x => `• \`${x.trigger}\` → \`${x.response}\``);
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "autoresponder", title: "🤖 Server Autoresponders", description: lines.join("\n") }));
        }
    },
};
