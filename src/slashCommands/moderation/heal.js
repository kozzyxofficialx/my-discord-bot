import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { doUntimeout } from "../../utils/moderationUtils.js";

export default {
    data: {
        name: "heal",
        description: "Remove a timeout from a user.",
        default_member_permissions: String(PermissionsBitField.Flags.ModerateMembers),
        dm_permission: false,
        options: [
            { name: "user", description: "User to remove timeout from", type: 6, required: true },
        ],
    },
    async execute(interaction) {
        const member = interaction.options.getMember("user");
        if (!member) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Error", description: "Could not find that member.", ephemeral: true }));
        return doUntimeout(interaction, member);
    },
};
