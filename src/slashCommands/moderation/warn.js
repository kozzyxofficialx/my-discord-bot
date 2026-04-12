import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload, postCase, caseEmbed, sendEmbed } from "../../utils/embeds.js";
import { getWarningData, saveWarnings, getGuildSettings } from "../../utils/database.js";
import { trySendModDM } from "../../utils/moderationUtils.js";

const WARN_THRESHOLD_EMOJIS = ["⚠️", "🚨", "🔥", "🛑", "⚡"];
function sendWarnThresholdNotice(channel, guildId, text) {
    const emoji = WARN_THRESHOLD_EMOJIS[Math.floor(Math.random() * WARN_THRESHOLD_EMOJIS.length)];
    return sendEmbed(channel, guildId, {
        type: "warning",
        title: `${emoji} Warn Threshold Triggered`,
        description: text,
    });
}

function checkWarnThresholds(member, warnCount, channel) {
    const settings = getGuildSettings(member.guild.id);
    if (!settings.warnThresholds) return;
    for (const t of settings.warnThresholds) {
        if (warnCount === t.count) {
            if (t.action === "timeout") {
                member.timeout((t.time || 0) * 60000, "Warn threshold").catch(() => {});
                sendWarnThresholdNotice(channel, member.guild.id, `${member.user.tag} has been **timed out** for **${t.time}m**.`);
            }
            if (t.action === "kick") {
                member.kick("Warn threshold").catch(() => {});
                sendWarnThresholdNotice(channel, member.guild.id, `${member.user.tag} has been **kicked**.`);
            }
            if (t.action === "ban") {
                member.ban({ reason: "Warn threshold" }).catch(() => {});
                sendWarnThresholdNotice(channel, member.guild.id, `${member.user.tag} has been **banned**.`);
            }
        }
    }
}

export default {
    data: {
        name: "warn",
        description: "Warn a user or remove warnings.",
        default_member_permissions: String(PermissionsBitField.Flags.ModerateMembers),
        dm_permission: false,
        options: [
            {
                name: "add", description: "Warn a user.", type: 1,
                options: [
                    { name: "user", description: "User to warn", type: 6, required: true },
                    { name: "reason", description: "Reason for the warning", type: 3, required: false },
                ],
            },
            {
                name: "remove", description: "Remove warnings from a user.", type: 1,
                options: [
                    { name: "user", description: "User to remove warnings from", type: 6, required: true },
                    { name: "count", description: "Number of warnings to remove (default: 1)", type: 4, required: false },
                ],
            },
        ],
    },
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const member = interaction.options.getMember("user");
        if (!member) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Error", description: "Could not find that member.", ephemeral: true }));

        if (sub === "remove") {
            const countToRemove = interaction.options.getInteger("count") || 1;
            const data = getWarningData(interaction.guildId, member.id);
            data.count = Math.max(0, data.count - countToRemove);
            data.history.push({ action: "remove", by: interaction.user.id, count: countToRemove, at: Date.now() });
            await saveWarnings();

            await trySendModDM({
                user: member.user,
                guild: interaction.guild,
                type: "mod",
                title: "🧹 Warnings reduced",
                description: "A moderator reduced your warning count.",
                moderatorTag: interaction.user.tag,
                reason: `Removed ${countToRemove} warning(s). New total: ${data.count}.`,
            });

            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "mod", title: "✅ Warnings Reduced", description: `Removed **${countToRemove}** warning(s) from **${member.user.tag}**.\nNew total: **${data.count}**.` }));
        }

        // sub === "add"
        const reason = interaction.options.getString("reason") || "No reason provided.";
        const data = getWarningData(interaction.guildId, member.id);
        data.count++;
        data.history.push({ action: "add", by: interaction.user.id, reason, at: Date.now() });
        await saveWarnings();

        checkWarnThresholds(member, data.count, interaction.channel);

        await trySendModDM({
            user: member.user,
            guild: interaction.guild,
            type: "warning",
            title: "⚠️ You received a warning",
            description: "A moderator has issued you a warning in the server.",
            moderatorTag: interaction.user.tag,
            reason: `${reason}\nTotal warnings: ${data.count}`,
        });

        await safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "warning", title: "⚠️ Warning Issued", description: `Warned **${member.user.tag}**.\n**Reason:** ${reason}\n**Total warnings:** ${data.count}` }));

        await postCase(interaction.guild, caseEmbed(interaction.guildId, "⚠️ Warning", [
            `**User:** ${member.user.tag}`,
            `**By:** ${interaction.user.tag}`,
            `**Reason:** ${reason}`,
            `**Total:** ${data.count}`,
        ]), interaction.channelId);
    },
};
