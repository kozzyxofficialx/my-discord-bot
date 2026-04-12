import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";

export default {
    data: {
        name: "nick",
        description: "Change a user's nickname.",
        default_member_permissions: String(PermissionsBitField.Flags.ManageNicknames),
        dm_permission: false,
        options: [
            { name: "user", description: "User to rename", type: 6, required: true },
            { name: "nickname", description: "New nickname", type: 3, required: true },
        ],
    },
    async execute(interaction) {
        const member = interaction.options.getMember("user");
        const newNick = interaction.options.getString("nickname");
        if (!member) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Error", description: "Could not find that member.", ephemeral: true }));

        await member.setNickname(newNick, `Changed by ${interaction.user.tag}`);
        return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "mod", title: "✅ Nickname Changed", description: `Changed nickname of **${member.user.tag}** to **${newNick}**.` }));
    },
};
