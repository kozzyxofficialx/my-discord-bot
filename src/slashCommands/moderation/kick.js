import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { doKick } from "../../utils/moderationUtils.js";

export default {
    data: {
        name: "kick",
        description: "Kick a user from the server.",
        default_member_permissions: String(PermissionsBitField.Flags.KickMembers),
        dm_permission: false,
        options: [
            { name: "user", description: "User to kick", type: 6, required: true },
            { name: "reason", description: "Reason for the kick", type: 3, required: false },
        ],
    },
    async execute(interaction) {
        const member = interaction.options.getMember("user");
        const reason = interaction.options.getString("reason") || "No reason provided.";
        if (!member) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Error", description: "Could not find that member.", ephemeral: true }));
        return doKick(interaction, member, reason);
    },
};
