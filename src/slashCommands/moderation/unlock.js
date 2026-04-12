import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";

export default {
    data: {
        name: "unlock",
        description: "Unlock a channel so members can send messages again.",
        default_member_permissions: String(PermissionsBitField.Flags.ManageChannels),
        dm_permission: false,
        options: [
            { name: "channel", description: "Channel to unlock (defaults to current)", type: 7, required: false },
        ],
    },
    async execute(interaction) {
        const target = interaction.options.getChannel("channel") || interaction.channel;
        if (!target?.isTextBased()) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Error", description: "Can only unlock text channels.", ephemeral: true }));

        const overwrite = target.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
        if (!overwrite || !overwrite.deny?.has("SendMessages")) {
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "info", title: "ℹ️ Not Locked", description: `${target} is not locked.`, ephemeral: true }));
        }

        await target.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null }, { reason: `Unlocked by ${interaction.user.tag}` });
        return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "mod", title: "🔓 Channel Unlocked", description: `Unlocked ${target}.` }));
    },
};
