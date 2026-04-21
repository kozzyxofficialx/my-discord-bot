import { PermissionsBitField } from "discord.js";
import { getWarningData, saveWarnings, getGuildSettings } from "../../utils/database.js";
import { replyEmbed, postCase, caseEmbed, sendEmbed } from "../../utils/embeds.js";
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
                member.timeout((t.time || 0) * 60000, "Warn threshold").catch(() => { });
                sendWarnThresholdNotice(channel, member.guild.id, `${member.user.tag} has been **timed out** for **${t.time}m**.`);
            }
            if (t.action === "kick") {
                member.kick("Warn threshold").catch(() => { });
                sendWarnThresholdNotice(channel, member.guild.id, `${member.user.tag} has been **kicked**.`);
            }
            if (t.action === "ban") {
                member.ban({ reason: "Warn threshold" }).catch(() => { });
                sendWarnThresholdNotice(channel, member.guild.id, `${member.user.tag} has been **banned**.`);
            }
        }
    }
}

export default {
    name: "warn",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return replyEmbed(message, { type: "error", title: "⛔ Permission Needed", description: "You need **Timeout Members** permission to warn." });
        }
        const target = message.mentions.members.first();
        if (!target) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "` ,warn @user [reason]` OR `,warn remove @user [count]`" });

        if (args[0] === "remove") {
            const countArg = args.find((a) => /^\d+$/.test(a));
            const countToRemove = countArg ? parseInt(countArg, 10) : 1;
            if (!Number.isFinite(countToRemove) || countToRemove <= 0) {
                return replyEmbed(message, { type: "error", title: "❌ Usage", description: "` ,warn remove @user [count]`" });
            }

            const data = getWarningData(message.guild.id, target.id);
            data.count = Math.max(0, data.count - countToRemove);
            data.history.push({ action: "remove", by: message.author.id, count: countToRemove, at: Date.now() });
            await saveWarnings();

            await trySendModDM({
                user: target.user,
                guild: message.guild,
                type: "mod",
                title: "🧹 Warnings reduced",
                description: "A moderator reduced your warning count.",
                moderatorTag: message.author.tag,
                reason: `Removed ${countToRemove} warning(s). New total: ${data.count}.`,
            });

            return replyEmbed(message, {
                type: "mod",
                title: "✅ Warnings Reduced",
                description: `Removed **${countToRemove}** warning(s) from **${target.user.tag}**.\nNew total: **${data.count}**.`,
            });
        }

        const reason = args.join(" ") || "No reason provided.";
        const data = getWarningData(message.guild.id, target.id);
        data.count++;
        data.history.push({ action: "add", by: message.author.id, reason, at: Date.now() });
        await saveWarnings();

        checkWarnThresholds(target, data.count, message.channel);

        await trySendModDM({
            user: target.user,
            guild: message.guild,
            type: "warning",
            title: "⚠️ You received a warning",
            description: "A moderator has issued you a warning in the server.",
            moderatorTag: message.author.tag,
            reason: `${reason}
    Total warnings: ${data.count}`,
        });

        await replyEmbed(message, {
            type: "warning",
            title: "⚠️ Warning Issued",
            description: `Warned **${target.user.tag}**.\n**Reason:** ${reason}\n**Total warnings:** ${data.count}`,
        });

        await postCase(message.guild, caseEmbed(message.guild.id, "⚠️ Warning", [
            `**User:** ${target.user.tag}`,
            `**By:** ${message.author.tag}`,
            `**Reason:** ${reason}`,
            `**Total:** ${data.count}`,
        ]), message.channel.id);
    }
};
