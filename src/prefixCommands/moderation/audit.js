import { PermissionsBitField, AuditLogEvent } from "discord.js";
import { replyEmbed } from "../../utils/embeds.js";
import { getGuildSettings } from "../../utils/database.js";
import { getDB } from "../../utils/db.js";

const ACTION_LABELS = {
    [AuditLogEvent.MemberBan]:        "🔨 Ban",
    [AuditLogEvent.MemberUnban]:      "✅ Unban",
    [AuditLogEvent.MemberKick]:       "👢 Kick",
    [AuditLogEvent.MemberUpdate]:     "✏️ Member Update",
    [AuditLogEvent.MemberRoleUpdate]: "🎭 Role Update",
    [AuditLogEvent.MessageDelete]:    "🗑️ Message Deleted",
    [AuditLogEvent.ChannelCreate]:    "📁 Channel Created",
    [AuditLogEvent.ChannelDelete]:    "📁 Channel Deleted",
    [AuditLogEvent.ChannelUpdate]:    "📁 Channel Updated",
    [AuditLogEvent.RoleCreate]:       "🎭 Role Created",
    [AuditLogEvent.RoleDelete]:       "🎭 Role Deleted",
    [AuditLogEvent.InviteCreate]:     "📨 Invite Created",
    [AuditLogEvent.InviteDelete]:     "📨 Invite Deleted",
    [AuditLogEvent.GuildUpdate]:      "⚙️ Server Updated",
};

export default {
    name: "audit",
    async execute(message, args) {
        if (!message.guild) return;
        if (!message.member.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) {
            return replyEmbed(message, { type: "error", title: "⛔ Permission Denied", description: "You need **View Audit Log**." });
        }

        const settings = getGuildSettings(message.guild.id);
        if (!settings.plugins?.audit_log) {
            return replyEmbed(message, { type: "error", title: "❌ Plugin Disabled", description: "The Audit Log plugin is not enabled. Use `/plugins enable audit_log`." });
        }

        const target = message.mentions.users.first();
        if (!target) {
            return replyEmbed(message, { type: "error", title: "❌ Usage", description: "`,audit @user`" });
        }

        const db = await getDB();
        const rows = await db.all(
            `SELECT action, executor_id, reason, created_at FROM audit_log
             WHERE guild_id = ? AND target_id = ?
             ORDER BY created_at DESC LIMIT 15`,
            message.guild.id, target.id
        );

        if (!rows.length) {
            return replyEmbed(message, { type: "info", title: "📋 Audit Log", description: `No logged actions found for ${target.tag}.` });
        }

        const lines = rows.map(r => {
            const label = ACTION_LABELS[Number(r.action)] ?? `Action ${r.action}`;
            const by = r.executor_id ? `<@${r.executor_id}>` : "_unknown_";
            const ts = `<t:${Math.floor(r.created_at / 1000)}:R>`;
            const reason = r.reason ? ` — ${r.reason.slice(0, 60)}` : "";
            return `${label} by ${by} ${ts}${reason}`;
        });

        return replyEmbed(message, {
            type: "info",
            title: `📋 Audit Log — ${target.tag}`,
            description: lines.join("\n"),
        });
    },
};
