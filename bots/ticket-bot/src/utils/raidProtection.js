import { PermissionsBitField } from "discord.js";
import { getGuildSettings, saveSettings } from "./database.js";

// guildId -> [joinTimestamp, ...]
const joinWindows = new Map();

// Returns true if a raid is detected (and triggers lockdown)
export async function checkRaid(member) {
    const guild = member.guild;
    const settings = getGuildSettings(guild.id);
    if (!settings.plugins?.anti_raid) return false;

    const { threshold = 10, windowMs = 60_000, action = "lockdown" } = settings.antiRaid ?? {};

    const now = Date.now();
    const window = (joinWindows.get(guild.id) ?? []).filter(t => now - t < windowMs);
    window.push(now);
    joinWindows.set(guild.id, window);

    if (window.length < threshold) return false;

    // Raid detected!
    console.warn(`[antiRaid] Raid detected in ${guild.name} — ${window.length} joins in ${windowMs / 1000}s`);
    joinWindows.delete(guild.id); // reset window

    if (action === "lockdown") {
        await lockdownGuild(guild, settings);
    } else if (action === "kick") {
        await member.kick("Anti-raid: rapid join spike").catch(() => null);
    } else if (action === "ban") {
        await guild.members.ban(member.id, { reason: "Anti-raid: rapid join spike" }).catch(() => null);
    }

    // Alert the owner
    try {
        const owner = await guild.fetchOwner();
        await owner.send(
            `⚠️ **Raid detected in ${guild.name}!**\n${window.length} members joined within ${windowMs / 1000} seconds.\n\nThe server has been ${action === "lockdown" ? "locked down" : action + "ed the raiders"}. Use \`/unraid\` to restore normal access.`
        ).catch(() => null);
    } catch { /* owner DMs off */ }

    // Post to case channel
    const { postCase, caseEmbed } = await import("./embeds.js");
    await postCase(guild, caseEmbed(guild.id, "🚨 Anti-Raid — Lockdown Triggered", [
        `**Joins in window:** ${window.length}`,
        `**Window:** ${windowMs / 1000}s`,
        `**Action:** ${action}`,
    ]));

    return true;
}

async function lockdownGuild(guild, settings) {
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
