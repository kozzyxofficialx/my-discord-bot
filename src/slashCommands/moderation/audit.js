import { PermissionsBitField, AuditLogEvent } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
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
    data: {
        name: "audit",
        description: "View audit log history for a user.",
        default_member_permissions: String(PermissionsBitField.Flags.ViewAuditLog),
        dm_permission: false,
        options: [
            { name: "user", description: "User to look up", type: 6, required: true },
        ],
    },
    async execute(interaction) {
        const settings = getGuildSettings(interaction.guildId);
        if (!settings.plugins?.audit_log) {
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Plugin Disabled", description: "The Audit Log plugin is not enabled. Use `/plugins enable Audit Log`.", ephemeral: true }));
        }

        const target = interaction.options.getUser("user");
        const db = await getDB();
        const rows = await db.all(
            `SELECT action, executor_id, reason, created_at FROM audit_log
             WHERE guild_id = ? AND target_id = ?
             ORDER BY created_at DESC LIMIT 15`,
            interaction.guildId, target.id
        );

        if (!rows.length) {
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "info", title: "📋 Audit Log", description: `No logged actions found for ${target.tag}.` }));
        }

        const lines = rows.map(r => {
            const label = ACTION_LABELS[Number(r.action)] ?? `Action ${r.action}`;
            const by = r.executor_id ? `<@${r.executor_id}>` : "_unknown_";
            const ts = `<t:${Math.floor(r.created_at / 1000)}:R>`;
            const reason = r.reason ? ` — ${r.reason.slice(0, 60)}` : "";
            return `${label} by ${by} ${ts}${reason}`;
        });

        return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "info", title: `📋 Audit Log — ${target.tag}`, description: lines.join("\n") }));
    },
};
