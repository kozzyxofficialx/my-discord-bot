import { getDB } from "./db.js";

// guildId -> Map<code, uses>
export const inviteCache = new Map();

// Seed invite cache for all guilds on startup
export async function seedInviteCache(client) {
    for (const [, guild] of client.guilds.cache) {
        try {
            const invites = await guild.invites.fetch();
            const map = new Map();
            for (const inv of invites.values()) map.set(inv.code, inv.uses ?? 0);
            inviteCache.set(guild.id, map);
        } catch { /* bot lacks Manage Guild or invites disabled */ }
    }
}

// Find which invite was used by comparing before/after snapshots
export async function resolveUsedInvite(guild) {
    const before = inviteCache.get(guild.id) ?? new Map();
    try {
        const current = await guild.invites.fetch();
        const after = new Map();
        for (const inv of current.values()) after.set(inv.code, inv.uses ?? 0);
        inviteCache.set(guild.id, after);

        for (const [code, uses] of after) {
            const prev = before.get(code) ?? 0;
            if (uses > prev) {
                const invite = current.get(code);
                return { code, inviterId: invite?.inviter?.id ?? null };
            }
        }
    } catch { /* guild invites unavailable */ }
    return { code: null, inviterId: null };
}

// Persist a join record
export async function recordJoin(guildId, userId, inviterId, inviteCode) {
    const db = await getDB();
    await db.run(
        "INSERT INTO invite_joins (guild_id, user_id, inviter_id, invite_code, joined_at) VALUES (?, ?, ?, ?, ?)",
        guildId, userId, inviterId, inviteCode, Date.now()
    );
}

// Get invite stats for a user (how many people they invited)
export async function getInviteStats(guildId, userId) {
    const db = await getDB();
    const total = await db.get(
        "SELECT COUNT(*) as count FROM invite_joins WHERE guild_id = ? AND inviter_id = ?",
        guildId, userId
    );
    const recent = await db.all(
        "SELECT user_id, joined_at FROM invite_joins WHERE guild_id = ? AND inviter_id = ? ORDER BY joined_at DESC LIMIT 10",
        guildId, userId
    );
    return { total: total?.count ?? 0, recent };
}

// Get who invited a specific user
export async function getInvitedBy(guildId, userId) {
    const db = await getDB();
    return db.get(
        "SELECT inviter_id, invite_code, joined_at FROM invite_joins WHERE guild_id = ? AND user_id = ? ORDER BY joined_at DESC LIMIT 1",
        guildId, userId
    );
}
