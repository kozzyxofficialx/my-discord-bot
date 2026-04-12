import { EmbedBuilder } from "discord.js";
import { getGuildSettings } from "./database.js";

// ---------------- TYPE METADATA ----------------
// Each embed type gets its own color, system label, and accent bar character.
const TYPE_META = {
    mod:            { default: 0xED4245, label: "Moderation System",  icon: "⚔️" },
    error:          { default: 0xFF2D55, label: "Error",               icon: "🚨" },
    success:        { default: 0x2ECC71, label: "Success",             icon: "✅" },
    warning:        { default: 0xF1C40F, label: "Warning",             icon: "⚠️" },
    info:           { default: 0x5865F2, label: "Information",         icon: "💡" },
    settings:       { default: 0xEB459E, label: "Settings",            icon: "⚙️" },
    ticket:         { default: 0x1ABC9C, label: "Ticket System",       icon: "🎫" },
    afk:            { default: 0x7289DA, label: "AFK",                 icon: "💤" },
    autoresponder:  { default: 0xE67E22, label: "Autoresponder",       icon: "🤖" },
    case:           { default: 0xC0392B, label: "Case Log",            icon: "📋" },
};

// ---------------- EMBED BUILDER ----------------
export function buildCoolEmbed({
    guildId,
    type = "info",
    client,
    title = null,
    description = null,
    footerUser = null,
    fields = null,
    showAuthor = false,
    showFooter = false,
    footerText = null,
    thumbnail = null,
}) {
    const settings = guildId ? getGuildSettings(guildId) : null;
    const meta = TYPE_META[type] ?? TYPE_META.info;

    // Guild can override color per type; otherwise use the vibrant default
    const color = settings?.embedColors?.[type] ?? meta.default;

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTimestamp();

    // Author line: bot avatar + "{icon} System Label"
    if ((showAuthor || true) && client?.user) {
        embed.setAuthor({
            name: `${meta.icon}  ${meta.label}`,
            iconURL: client.user.displayAvatarURL({ dynamic: true }),
        });
    }

    if (title)       embed.setTitle(title);
    if (thumbnail)   embed.setThumbnail(thumbnail);

    // Description: wrap in a styled block with a decorative separator
    if (description) {
        embed.setDescription(`${description}\n\n${"▬".repeat(28)}`);
    }

    if (Array.isArray(fields) && fields.length) embed.addFields(fields);

    // Footer: user avatar + "Requested by X  •  System Label"
    if (footerUser) {
        embed.setFooter({
            text: `Requested by ${footerUser.tag}  •  ${meta.label}`,
            iconURL: footerUser.displayAvatarURL({ dynamic: true }),
        });
    } else if (footerText) {
        embed.setFooter({ text: `${footerText}  •  ${meta.label}` });
    } else {
        embed.setFooter({ text: meta.label });
    }

    return embed;
}

export function asEmbedPayload({ guildId, type, client, title, description, footerUser, fields, ephemeral = false, components = undefined, allowedMentions = undefined }) {
    return {
        embeds: [buildCoolEmbed({ guildId, type, client, title, description, footerUser, fields, showAuthor: true })],
        ephemeral,
        components,
        allowedMentions,
    };
}

export async function replyEmbed(message, opts) {
    const reply = await message.reply(asEmbedPayload({ guildId: message.guild?.id, footerUser: message.author, client: message.client, ...opts }));
    if (message.guild && reply) {
        const settings = getGuildSettings(message.guild.id);
        const delaySec = settings.prefixDeleteCooldown ?? 3;
        if (delaySec !== false && delaySec > 0) {
            setTimeout(() => {
                reply.delete().catch(() => null);
                message.delete().catch(() => null);
            }, delaySec * 1000);
        }
    }
    return reply;
}

export async function permissionError(message, description) {
    return replyEmbed(message, { type: "error", title: "⛔ Permission Needed", description });
}

export async function sendEmbed(channel, guildId, opts) {
    return channel.send(asEmbedPayload({ guildId, client: channel.client, ...opts }));
}

// ---------------- CASE SYSTEM HELPERS ----------------
export function caseEmbed(guildId, title, lines = []) {
    return buildCoolEmbed({
        guildId,
        type: "case",
        title,
        description: lines.filter(Boolean).join("\n"),
        footerUser: null,
    });
}

export async function postCase(guild, embed, originChannelId = null) {
    try {
        if (!guild) return;
        const settings = getGuildSettings(guild.id);
        if (!settings.caseChannelId) return;

        if (originChannelId && settings.caseChannelId === originChannelId) return;

        const ch = guild.channels.cache.get(settings.caseChannelId);
        if (!ch || !ch.isTextBased()) return;

        await ch.send({ embeds: [embed] });
    } catch (err) {
        console.error("Case post error:", err);
    }
}
