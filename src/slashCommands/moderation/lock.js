import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";

export default {
    data: {
        name: "lock",
        description: "Lock a channel so members can't send messages.",
        default_member_permissions: String(PermissionsBitField.Flags.ManageChannels),
        dm_permission: false,
        options: [
            { name: "channel", description: "Channel to lock (defaults to current)", type: 7, required: false },
            { name: "reason", description: "Reason for locking", type: 3, required: false },
        ],
    },
    async execute(interaction) {
        const target = interaction.options.getChannel("channel") || interaction.channel;
        if (!target?.isTextBased()) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Error", description: "Can only lock text channels.", ephemeral: true }));

        const overwrite = target.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
        if (overwrite?.deny?.has("SendMessages")) {
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "info", title: "ℹ️ Already Locked", description: `${target} is already locked.`, ephemeral: true }));
        }

        const reason = interaction.options.getString("reason") || "Channel locked";
        await target.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }, { reason: `${reason} (by ${interaction.user.tag})` });
        return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "mod", title: "🔒 Channel Locked", description: `Locked ${target}.\n**Reason:** ${reason}` }));
    },
};
