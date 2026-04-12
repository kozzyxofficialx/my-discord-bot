import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";

export default {
    data: {
        name: "autoresponder_filter",
        description: "Toggle the autoresponder bad-word/spam filter.",
        default_member_permissions: String(PermissionsBitField.Flags.ManageGuild),
        dm_permission: false,
        options: [
            { name: "state", description: "Turn filter on or off", type: 3, required: true, choices: [{ name: "On", value: "on" }, { name: "Off", value: "off" }] },
        ],
    },
    async execute(interaction) {
        const state = interaction.options.getString("state");
        const enabling = state === "on";
        const settings = getGuildSettings(interaction.guildId);

        if (settings.autoresponderFilterOn === enabling) {
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "info", title: "ℹ️ Already " + (enabling ? "Enabled" : "Disabled"), description: `Autoresponder filter is already **${enabling ? "ON" : "OFF"}**.`, ephemeral: true }));
        }
        settings.autoresponderFilterOn = enabling;
        await saveSettings();
        return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "settings", title: enabling ? "✅ Filter Enabled" : "✅ Filter Disabled", description: `Autoresponder filter is now **${enabling ? "ON" : "OFF"}**.` }));
    },
};
