import { buildCoolEmbed, replyEmbed, postCase, caseEmbed, asEmbedPayload } from "./embeds.js";
import { safeRespond } from "./helpers.js";

// Detect if ctx is a slash interaction or a message
function isInteraction(ctx) { return !!ctx.user && !ctx.author; }
function getAuthor(ctx) { return ctx.author || ctx.user; }
function getChannelId(ctx) { return ctx.channel?.id || ctx.channelId; }

async function reply(ctx, opts) {
    if (isInteraction(ctx)) {
        return safeRespond(ctx, asEmbedPayload({ guildId: ctx.guildId, ...opts }));
    }
    return replyEmbed(ctx, opts);
}

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

export async function doKick(ctx, target, reason) {
    const author = getAuthor(ctx);
    try {
        await trySendModDM({
            user: target.user,
            guild: ctx.guild,
            type: "mod",
            title: "👢 You were kicked",
            description: "You have been kicked from the server.",
            moderatorTag: author.tag,
            reason,
        });
        await target.kick(reason);

        await reply(ctx, {
            type: "mod",
            title: "👢 Kick",
            description: `Kicked **${target.user.tag}**.\n**Reason:** ${reason}`,
        });

        await postCase(ctx.guild, caseEmbed(ctx.guild.id, "👢 Kick", [
            `**User:** ${target.user.tag}`,
            `**By:** ${author.tag}`,
            `**Reason:** ${reason}`,
        ]), getChannelId(ctx));
    } catch {
        return reply(ctx, { type: "error", title: "❌ Kick Failed", description: "Failed to kick that user." });
    }
}

export async function doBan(ctx, target, reason) {
    const author = getAuthor(ctx);
    try {
        // Check if appeals plugin is enabled — include appeal instructions in DM
        const { getGuildSettings } = await import("./database.js");
        const settings = getGuildSettings(ctx.guild.id);
        const appealNote = settings.plugins?.appeals
            ? `\n\nTo appeal this ban, use \`/appeal\` in any server with this bot and enter server ID \`${ctx.guild.id}\`.`
            : "";

        await trySendModDM({
            user: target,
            guild: ctx.guild,
            type: "mod",
            title: "🔨 You were banned",
            description: `You have been banned from the server.${appealNote}`,
            moderatorTag: author.tag,
            reason,
        });
        await ctx.guild.members.ban(target.id, { reason });

        await reply(ctx, {
            type: "mod",
            title: "🔨 Ban",
            description: `Banned **${target.tag}**.\n**Reason:** ${reason}`,
        });

        await postCase(ctx.guild, caseEmbed(ctx.guild.id, "🔨 Ban", [
            `**User:** ${target.tag}`,
            `**By:** ${author.tag}`,
            `**Reason:** ${reason}`,
        ]), getChannelId(ctx));
    } catch {
        return reply(ctx, { type: "error", title: "❌ Ban Failed", description: "Failed to ban that user." });
    }
}

export async function doTimeout(ctx, target, ms) {
    const author = getAuthor(ctx);
    try {
        const minutes = Math.round(ms / 60000);
        await trySendModDM({
            user: target.user,
            guild: ctx.guild,
            type: "mod",
            title: "⏱️ You were timed out",
            description: "You have been timed out in the server.",
            moderatorTag: author.tag,
            reason: `Timed out for ${minutes} minute(s).`,
            durationText: `${minutes} minute(s)`,
        });
        await target.timeout(ms, `Timed out by ${author.tag}`);

        await reply(ctx, {
            type: "mod",
            title: "⏱️ Timeout",
            description: `Timed out ${target} for **${minutes} minutes**.`,
        });

        await postCase(ctx.guild, caseEmbed(ctx.guild.id, "⏱️ Timeout", [
            `**User:** ${target.user.tag}`,
            `**By:** ${author.tag}`,
            `**Duration:** ${minutes} minutes`,
        ]), getChannelId(ctx));
    } catch {
        return reply(ctx, { type: "error", title: "❌ Timeout Failed", description: "Failed to timeout user." });
    }
}

export async function doUntimeout(ctx, target) {
    const author = getAuthor(ctx);
    try {
        await trySendModDM({
            user: target.user,
            guild: ctx.guild,
            type: "mod",
            title: "✅ Timeout removed",
            description: "Your timeout has been removed.",
            moderatorTag: author.tag,
            reason: "Timeout removed.",
        });
        await target.timeout(null, `Timeout removed by ${author.tag}`);

        await reply(ctx, {
            type: "mod",
            title: "✅ Timeout Removed",
            description: `Removed timeout from ${target}.`,
        });

        await postCase(ctx.guild, caseEmbed(ctx.guild.id, "✅ Timeout Removed", [
            `**User:** ${target.user.tag}`,
            `**By:** ${author.tag}`,
        ]), getChannelId(ctx));
    } catch {
        return reply(ctx, { type: "error", title: "❌ Failed", description: "Failed to remove timeout." });
    }
}
