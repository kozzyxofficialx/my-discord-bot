import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";

export default {
    data: {
        name: "slowmode",
        description: "Set slowmode for a channel.",
        default_member_permissions: String(PermissionsBitField.Flags.ManageChannels),
        dm_permission: false,
        options: [
            { name: "seconds", description: "Slowmode in seconds (0 to disable, max 21600)", type: 4, required: true },
            { name: "channel", description: "Channel to set slowmode on (defaults to current)", type: 7, required: false },
        ],
    },
    async execute(interaction) {
        const seconds = interaction.options.getInteger("seconds");
        const target = interaction.options.getChannel("channel") || interaction.channel;
        if (!target?.isTextBased()) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Error", description: "Can only set slowmode on text channels.", ephemeral: true }));
        if (seconds < 0 || seconds > 21600) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Invalid", description: "Slowmode must be between **0** and **21600** seconds.", ephemeral: true }));

        await target.setRateLimitPerUser(seconds, `Changed by ${interaction.user.tag}`);
        return safeRespond(interaction, asEmbedPayload({
            guildId: interaction.guildId, type: "settings",
            title: "⏱️ Slowmode Updated",
            description: seconds === 0 ? `Slowmode disabled in ${target}.` : `Slowmode set in ${target} to **${seconds}** seconds.`,
        }));
    },
};
