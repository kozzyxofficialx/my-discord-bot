import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";

export default {
    data: {
        name: "clear",
        description: "Delete messages in bulk (1–100).",
        default_member_permissions: String(PermissionsBitField.Flags.ManageMessages),
        dm_permission: false,
        options: [
            { name: "amount", description: "Number of messages to delete (1–100)", type: 4, required: true },
        ],
    },
    async execute(interaction) {
        const amount = interaction.options.getInteger("amount");
        if (amount < 1 || amount > 100) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Invalid", description: "Amount must be between **1** and **100**.", ephemeral: true }));

        await interaction.deferReply({ ephemeral: true });
        const deleted = await interaction.channel.bulkDelete(amount, true);
        return safeRespond(interaction, asEmbedPayload({
            guildId: interaction.guildId, type: "success",
            title: "🧹 Messages Cleared",
            description: `Cleared **${deleted.size}** messages.`,
            ephemeral: true,
        }));
    },
};
