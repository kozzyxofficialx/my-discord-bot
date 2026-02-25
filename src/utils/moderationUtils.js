import { buildCoolEmbed, replyEmbed, postCase, caseEmbed } from "./embeds.js";

// ---------------- MOD ACTION DMs ----------------
export async function trySendModDM({ user, guild, type = "mod", title, description, moderatorTag, reason, durationText }) {
    try {
        if (!user || !guild) return false;

        const fields = [
            { name: "Server", value: `${guild.name}`, inline: true },
            { name: "Moderator", value: moderatorTag ? moderatorTag : "Unknown", inline: true },
        ];

        if (reason) fields.push({ name: "Reason", value: String(reason).slice(0, 1024), inline: false });
        if (durationText) fields.push({ name: "Duration", value: durationText, inline: true });
        fields.push({ name: "Your ID", value: `${user.id}`, inline: true });

        const embed = buildCoolEmbed({
            guildId: guild.id,
            type,
            title,
            description,
            fields,
            showAuthor: true,
            showFooter: true,
            footerText: `${guild.name}`,
        });

        await user.send({ embeds: [embed] });
        return true;
    } catch {
        return false; // DMs closed etc.
    }
}

export async function doKick(message, target, reason) {
    try {
        await trySendModDM({
            user: target.user,
            guild: message.guild,
            type: "mod",
            title: "👢 You were kicked",
            description: "You have been kicked from the server.",
            moderatorTag: message.author.tag,
            reason,
        });
        await target.kick(reason);

        await replyEmbed(message, {
            type: "mod",
            title: "👢 Kick",
            description: `Kicked **${target.user.tag}**.\n**Reason:** ${reason}`,
        });

        await postCase(message.guild, caseEmbed(message.guild.id, "👢 Kick", [
            `**User:** ${target.user.tag}`,
            `**By:** ${message.author.tag}`,
            `**Reason:** ${reason}`,
        ]), message.channel.id);
    } catch {
        return replyEmbed(message, { type: "error", title: "❌ Kick Failed", description: "Failed to kick that user." });
    }
}

export async function doBan(message, target, reason) {
    try {
        await trySendModDM({
            user: target,
            guild: message.guild,
            type: "mod",
            title: "🔨 You were banned",
            description: "You have been banned from the server.",
            moderatorTag: message.author.tag,
            reason,
        });
        await message.guild.members.ban(target.id, { reason });

        await replyEmbed(message, {
            type: "mod",
            title: "🔨 Ban",
            description: `Banned **${target.tag}**.\n**Reason:** ${reason}`,
        });

        await postCase(message.guild, caseEmbed(message.guild.id, "🔨 Ban", [
            `**User:** ${target.tag}`,
            `**By:** ${message.author.tag}`,
            `**Reason:** ${reason}`,
        ]), message.channel.id);
    } catch {
        return replyEmbed(message, { type: "error", title: "❌ Ban Failed", description: "Failed to ban that user." });
    }
}

export async function doTimeout(message, target, ms) {
    try {
        const minutes = Math.round(ms / 60000);
        await trySendModDM({
            user: target.user,
            guild: message.guild,
            type: "mod",
            title: "⏱️ You were timed out",
            description: "You have been timed out in the server.",
            moderatorTag: message.author.tag,
            reason: `Timed out for ${minutes} minute(s).`,
            durationText: `${minutes} minute(s)`,
        });
        await target.timeout(ms, `Timed out by ${message.author.tag}`);

        await replyEmbed(message, {
            type: "mod",
            title: "⏱️ Timeout",
            description: `Timed out ${target} for **${minutes} minutes**.`,
        });

        await postCase(message.guild, caseEmbed(message.guild.id, "⏱️ Timeout", [
            `**User:** ${target.user.tag}`,
            `**By:** ${message.author.tag}`,
            `**Duration:** ${minutes} minutes`,
        ]), message.channel.id);
    } catch {
        return replyEmbed(message, { type: "error", title: "❌ Timeout Failed", description: "Failed to timeout user." });
    }
}

export async function doUntimeout(message, target) {
    try {
        await trySendModDM({
            user: target.user,
            guild: message.guild,
            type: "mod",
            title: "✅ Timeout removed",
            description: "Your timeout has been removed.",
            moderatorTag: message.author.tag,
            reason: "Timeout removed.",
        });
        await target.timeout(null, `Timeout removed by ${message.author.tag}`);

        await replyEmbed(message, {
            type: "mod",
            title: "✅ Timeout Removed",
            description: `Removed timeout from ${target}.`,
        });

        await postCase(message.guild, caseEmbed(message.guild.id, "✅ Timeout Removed", [
            `**User:** ${target.user.tag}`,
            `**By:** ${message.author.tag}`,
        ]), message.channel.id);
    } catch {
        return replyEmbed(message, { type: "error", title: "❌ Failed", description: "Failed to remove timeout." });
    }
}
