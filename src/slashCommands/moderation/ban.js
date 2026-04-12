import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { doBan } from "../../utils/moderationUtils.js";

export default {
    data: {
        name: "ban",
        description: "Ban a user from the server.",
        default_member_permissions: String(PermissionsBitField.Flags.BanMembers),
        dm_permission: false,
        options: [
            { name: "user", description: "User to ban", type: 6, required: true },
            { name: "reason", description: "Reason for the ban", type: 3, required: false },
        ],
    },
    async execute(interaction) {
        const user = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason") || "No reason provided.";
        if (!user) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Error", description: "Could not find that user.", ephemeral: true }));
        return doBan(interaction, user, reason);
    },
};
