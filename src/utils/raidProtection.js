import { PermissionsBitField } from "discord.js";
import { getGuildSettings, saveSettings } from "./database.js";
import { buildCoolEmbed } from "./embeds.js";
import { createCase } from "./moderationUtils.js";

// guildId -> [{ id, joinedAt, accountAge }]
const joinWindows = new Map();
// guildId -> Set<userId> of recent raiders, tracked across most recent lockdown
const recentRaiders = new Map();

const NEW_ACCOUNT_DAYS = 7; // <7 days = "new" for embed flag

function getJoinWindow(guildId, windowMs) {
    const now = Date.now();
    const list = (joinWindows.get(guildId) ?? []).filter(j => now - j.joinedAt < windowMs);
    joinWindows.set(guildId, list);
    return list;
}

async function postRaidAlert({ guild, embed, alertChannelId }) {
    // 1. Alert channel (if configured)
    if (alertChannelId) {
        const ch = guild.channels.cache.get(alertChannelId);
        if (ch?.isTextBased()) {
            await ch.send({ content: "@here", embeds: [embed], allowedMentions: { parse: ["everyone"] } }).catch(() => {});
        }
    }
    // 2. Case channel
    const settings = getGuildSettings(guild.id);
    if (settings.caseChannelId && settings.caseChannelId !== alertChannelId) {
        const ch = guild.channels.cache.get(settings.caseChannelId);
        if (ch?.isTextBased()) await ch.send({ embeds: [embed] }).catch(() => {});
    }
    // 3. Owner DM
    try {
        const owner = await guild.fetchOwner();
        await owner.send({ embeds: [embed] });
    } catch {}
}

export async function checkRaid(member) {
    const guild = member.guild;
    const settings = getGuildSettings(guild.id);
    if (!settings.plugins?.anti_raid) return false;

    const cfg = settings.antiRaid ?? {};
    const threshold = cfg.threshold ?? 10;
    const windowMs = cfg.windowMs ?? 60_000;
    const action = cfg.action ?? "lockdown";
    const minAccountAgeMs = cfg.minAccountAgeMs ?? 0;

    const accountAge = Date.now() - member.user.createdTimestamp;
    const window = getJoinWindow(guild.id, windowMs);
    window.push({ id: member.id, tag: member.user.tag, joinedAt: Date.now(), accountAge });

    // ── Account-age filter (only fires during active raid pressure)
    // If the join window is already at 50%+ threshold and this account is too new, auto-kick
    if (minAccountAgeMs > 0 && window.length >= Math.ceil(threshold / 2) && accountAge < minAccountAgeMs) {
        await member.kick(`Anti-raid: account too new during join spike (age: ${Math.round(accountAge / 86400000)}d)`).catch(() => null);
        const raiders = recentRaiders.get(guild.id) ?? new Set();
        raiders.add(member.id);
        recentRaiders.set(guild.id, raiders);
    }

    if (window.length < threshold) return false;

    // ── Raid detected
    console.warn(`[antiRaid] Raid detected in ${guild.name} — ${window.length} joins in ${windowMs / 1000}s`);

    // Snapshot raiders before resetting window
    const raiders = window.map(j => ({ id: j.id, tag: j.tag, accountAge: j.accountAge }));
    recentRaiders.set(guild.id, new Set(raiders.map(r => r.id)));
    joinWindows.delete(guild.id);

    if (action === "lockdown") {
        await lockdownGuild(guild);
    } else if (action === "kick") {
        for (const r of raiders) {
            await guild.members.kick(r.id, "Anti-raid: rapid join spike").catch(() => null);
        }
    } else if (action === "ban") {
        for (const r of raiders) {
            await guild.members.ban(r.id, { reason: "Anti-raid: rapid join spike" }).catch(() => null);
        }
    }

    const newAccounts = raiders.filter(r => r.accountAge < NEW_ACCOUNT_DAYS * 86400000).length;
    const raiderList = raiders
        .slice(0, 10)
        .map(r => `• \`${r.tag}\` (${Math.round(r.accountAge / 86400000)}d old)`)
        .join("\n");

    const embed = buildCoolEmbed({
        guildId: guild.id,
        type: "error",
        title: "🚨 Anti-Raid Triggered",
        description: `**${window.length} accounts** joined within **${windowMs / 1000}s**.`,
        fields: [
            { name: "🛡️ Action Taken", value: `\`${action.toUpperCase()}\``, inline: true },
            { name: "🆕 New Accounts (<7d)", value: `${newAccounts}/${raiders.length}`, inline: true },
            { name: "⏱️ Window", value: `${windowMs / 1000}s`, inline: true },
            { name: "👥 Raiders", value: raiderList + (raiders.length > 10 ? `\n*+${raiders.length - 10} more*` : ""), inline: false },
            {
                name: "💡 Recovery",
                value: action === "lockdown"
                    ? "Use `,unraid` to lift the lockdown.\nUse `,banraid` to ban all detected raiders.\nUse `,raidlist` to see all detected raider IDs."
                    : "Use `,raidlist` to see all detected raider IDs.",
                inline: false,
            },
        ],
        showAuthor: false,
        showFooter: true,
        footerText: `Anti-Raid • ${guild.name}`,
    });

    await postRaidAlert({ guild, embed, alertChannelId: cfg.alertChannelId });

    try {
        await createCase({
            guild,
            action: `anti_raid_${action}`,
            target: { id: "0", tag: `${raiders.length} raiders` },
            executor: { id: guild.client.user.id, tag: "AntiRaid System" },
            reason: `${raiders.length} joins in ${windowMs / 1000}s`,
        });
    } catch {}

    return true;
}

async function lockdownGuild(guild) {
    const settings = getGuildSettings(guild.id);
    settings.raidLockdown = true;
    await saveSettings();

    const everyone = guild.roles.everyone;
    try {
        await everyone.setPermissions(
            everyone.permissions.remove(PermissionsBitField.Flags.SendMessages),
            "Anti-raid lockdown"
        );
    } catch (err) {
        console.error("[antiRaid] Failed to lock guild:", err);
    }
}

export async function unlockGuild(guild) {
    const settings = getGuildSettings(guild.id);
    settings.raidLockdown = false;
    await saveSettings();

    const everyone = guild.roles.everyone;
    try {
        await everyone.setPermissions(
            everyone.permissions.add(PermissionsBitField.Flags.SendMessages),
            "Anti-raid lockdown lifted"
        );
    } catch (err) {
        console.error("[antiRaid] Failed to unlock guild:", err);
    }
}

// ── PUBLIC ACCESSORS ────────────────────────────────────────────────────
export function getRecentRaiders(guildId) {
    return recentRaiders.get(guildId) ?? new Set();
}

export function clearRecentRaiders(guildId) {
    recentRaiders.delete(guildId);
}

// ── MASS-MENTION DETECTION ──────────────────────────────────────────────
const massMentionCooldown = new Map(); // userId -> last action timestamp

export async function checkMassMention(message) {
    if (!message.guild || message.author.bot) return false;
    const settings = getGuildSettings(message.guild.id);
    if (!settings.plugins?.anti_raid) return false;

    const cfg = settings.antiRaid ?? {};
    const threshold = cfg.massMentionThreshold ?? 0;
    if (!threshold || threshold <= 0) return false;

    const userMentions = message.mentions.users?.size ?? 0;
    const roleMentions = message.mentions.roles?.size ?? 0;
    const totalMentions = userMentions + roleMentions;
    const everyoneMention = message.mentions.everyone ? 5 : 0; // weighted heavier

    const score = totalMentions + everyoneMention;
    if (score < threshold) return false;

    // Cooldown to prevent double-action on rapid messages
    const last = massMentionCooldown.get(message.author.id) ?? 0;
    if (Date.now() - last < 5000) return false;
    massMentionCooldown.set(message.author.id, Date.now());

    const member = message.member;
    if (!member) return false;
    // Don't act on staff
    if (member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return false;

    const timeoutMs = cfg.massMentionTimeoutMs ?? 10 * 60_000;
    try {
        await message.delete().catch(() => {});
        await member.timeout(timeoutMs, `Anti-raid: mass-mention spam (${score} mentions)`);
        await createCase({
            guild: message.guild,
            action: "auto_timeout",
            target: member.user,
            executor: { id: message.client.user.id, tag: "AntiRaid System" },
            reason: `Mass-mention spam (${score} mentions in one message)`,
            durationMs: timeoutMs,
        });

        const embed = buildCoolEmbed({
            guildId: message.guild.id,
            type: "warning",
            title: "🚨 Mass-Mention Auto-Timeout",
            fields: [
                { name: "👤 User", value: `${member}\n\`${member.id}\``, inline: true },
                { name: "📊 Mentions", value: `**${score}** in one message`, inline: true },
                { name: "⏱️ Timeout", value: `${Math.round(timeoutMs / 60000)}m`, inline: true },
                { name: "📁 Channel", value: `${message.channel}`, inline: false },
            ],
            showAuthor: false,
            showFooter: true,
            footerText: `Anti-Raid • ${message.guild.name}`,
        }).setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }));

        if (cfg.alertChannelId) {
            const ch = message.guild.channels.cache.get(cfg.alertChannelId);
            if (ch?.isTextBased()) await ch.send({ embeds: [embed] }).catch(() => {});
        }
        const caseChannel = settings.caseChannelId ? message.guild.channels.cache.get(settings.caseChannelId) : null;
        if (caseChannel?.isTextBased() && caseChannel.id !== cfg.alertChannelId) {
            await caseChannel.send({ embeds: [embed] }).catch(() => {});
        }
        return true;
    } catch (err) {
        console.error("[antiRaid] mass-mention action failed:", err);
        return false;
    }
}
