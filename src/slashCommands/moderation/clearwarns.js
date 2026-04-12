import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload, postCase, caseEmbed } from "../../utils/embeds.js";
import { getWarningData, saveWarnings } from "../../utils/database.js";
import { trySendModDM } from "../../utils/moderationUtils.js";

export default {
    data: {
        name: "clearwarns",
        description: "Clear all warnings for a user.",
        default_member_permissions: String(PermissionsBitField.Flags.ModerateMembers),
        dm_permission: false,
        options: [
            { name: "user", description: "User to clear warnings for", type: 6, required: true },
        ],
    },
    async execute(interaction) {
        const member = interaction.options.getMember("user");
        if (!member) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Error", description: "Could not find that member.", ephemeral: true }));

        const data = getWarningData(interaction.guildId, member.id);
        if (data.count === 0) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "info", title: "ℹ️ No Warnings", description: `**${member.user.tag}** already has no warnings.`, ephemeral: true }));

        data.count = 0;
        data.history.push({ action: "clear", by: interaction.user.id, at: Date.now() });
        await saveWarnings();

        await trySendModDM({
            user: member.user,
            guild: interaction.guild,
            type: "success",
            title: "✅ Warnings cleared",
            description: "All warnings in the server were cleared by a moderator.",
            moderatorTag: interaction.user.tag,
            reason: "Warnings cleared.",
        });

        await safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "success", title: "🧽 Warnings Cleared", description: `Cleared all warnings for **${member.user.tag}**.` }));

        await postCase(interaction.guild, caseEmbed(interaction.guildId, "🧽 Warnings Cleared", [
            `**User:** ${member.user.tag}`,
            `**By:** ${interaction.user.tag}`,
        ]), interaction.channelId);
    },
};
