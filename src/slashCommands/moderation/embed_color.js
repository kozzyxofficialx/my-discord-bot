import { PermissionsBitField } from "discord.js";
import { safeRespond, parseHexColorToInt } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";

export default {
    data: {
        name: "embed_color",
        description: "Set the color for a specific embed type.",
        default_member_permissions: String(PermissionsBitField.Flags.ManageGuild),
        dm_permission: false,
        options: [
            { name: "type", description: "Embed type (e.g. ticket, mod, info, success, error, warning, case, afk, autoresponder, settings)", type: 3, required: true },
            { name: "hex", description: "Hex color (e.g. #57F287)", type: 3, required: true },
        ],
    },
    async execute(interaction) {
        const type = interaction.options.getString("type").toLowerCase();
        const hex = interaction.options.getString("hex");
        const colorInt = parseHexColorToInt(hex);
        if (colorInt === null) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Invalid Color", description: "Hex must look like `#57F287` (6 hex digits).", ephemeral: true }));

        const settings = getGuildSettings(interaction.guildId);
        settings.embedColors[type] = colorInt;
        await saveSettings();
        return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "settings", title: "🎨 Embed Color Updated", description: `Set **${type}** embed color to **${hex.toUpperCase()}**.` }));
    },
};
