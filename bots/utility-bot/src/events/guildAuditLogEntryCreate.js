import { Events, AuditLogEvent } from "discord.js";
import { getGuildSettings } from "../utils/database.js";
import { getDB } from "../utils/db.js";

// Only persist these action types — keeps the table focused
const TRACKED_ACTIONS = new Set([
    AuditLogEvent.MemberBan,
    AuditLogEvent.MemberUnban,
    AuditLogEvent.MemberKick,
    AuditLogEvent.MemberUpdate,
    AuditLogEvent.MemberRoleUpdate,
    AuditLogEvent.MessageDelete,
    AuditLogEvent.ChannelCreate,
    AuditLogEvent.ChannelDelete,
    AuditLogEvent.ChannelUpdate,
    AuditLogEvent.RoleCreate,
    AuditLogEvent.RoleDelete,
    AuditLogEvent.InviteCreate,
    AuditLogEvent.InviteDelete,
    AuditLogEvent.GuildUpdate,
]);

export default {
    name: Events.GuildAuditLogEntryCreate,
    async execute(entry, guild) {
        if (!TRACKED_ACTIONS.has(entry.action)) return;

        const settings = getGuildSettings(guild.id);
        if (!settings.plugins?.audit_log) return;

        try {
            const db = await getDB();
            await db.run(
                `INSERT INTO audit_log (guild_id, action, target_id, executor_id, reason, changes_json, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                guild.id,
                String(entry.action),
                entry.target?.id ?? null,
                entry.executor?.id ?? null,
                entry.reason ?? null,
                entry.changes?.length ? JSON.stringify(entry.changes) : null,
                Date.now()
            );
        } catch (err) {
            console.error("[auditLog] Failed to persist entry:", err);
        }
    },
};
