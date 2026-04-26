import { ChannelType } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { buildCoolEmbed, asEmbedPayload } from "../../utils/embeds.js";

const VERIFICATION_LEVELS = {
    0: "🔓 None",
    1: "📧 Low (verified email)",
    2: "📅 Medium (registered 5+ min)",
    3: "👥 High (in server 10+ min)",
    4: "📱 Very High (verified phone)",
};

const CONTENT_FILTER = {
    0: "🔓 Disabled",
    1: "🛡️ Members without roles",
    2: "🛡️ All members",
};

const NSFW_LEVEL = {
    0: "Default",
    1: "Explicit",
    2: "Safe",
    3: "Age Restricted",
};

const BOOST_TIERS = {
    0: "None",
    1: "Tier 1",
    2: "Tier 2",
    3: "Tier 3",
};

export default {
    data: { name: "serverinfo", description: "Show detailed info about this server" },
    async execute(i) {
        const g = i.guild;
        if (!g) {
            return safeRespond(i, asEmbedPayload({
                guildId: null, type: "error", title: "❌ Server Only",
                description: "This command must be used inside a server.",
                ephemeral: true,
            }));
        }

        await g.channels.fetch().catch(() => {});
        await g.members.fetch({ withPresences: false, limit: 0 }).catch(() => {});

        const owner = await g.fetchOwner().catch(() => null);
        const created = `<t:${Math.floor(g.createdTimestamp / 1000)}:F> (<t:${Math.floor(g.createdTimestamp / 1000)}:R>)`;

        const channels = g.channels.cache;
        const textCount = channels.filter(c => c.type === ChannelType.GuildText).size;
        const voiceCount = channels.filter(c => c.type === ChannelType.GuildVoice).size;
        const stageCount = channels.filter(c => c.type === ChannelType.GuildStageVoice).size;
        const categoryCount = channels.filter(c => c.type === ChannelType.GuildCategory).size;
        const forumCount = channels.filter(c => c.type === ChannelType.GuildForum).size;
        const threadCount = channels.filter(c => c.isThread?.()).size;

        const memberCount = g.memberCount;
        const botCount = g.members.cache.filter(m => m.user.bot).size;
        const humanCount = memberCount - botCount;

        const emojiCount = g.emojis.cache.size;
        const stickerCount = g.stickers?.cache?.size ?? 0;
        const animatedEmojis = g.emojis.cache.filter(e => e.animated).size;

        const roleCount = g.roles.cache.size - 1; // exclude @everyone
        const topRoles = g.roles.cache
            .filter(r => r.id !== g.id)
            .sort((a, b) => b.position - a.position)
            .first(5)
            .map(r => r.toString())
            .join(" ") || "None";

        const features = (g.features ?? []).map(f => `\`${f.toLowerCase().replace(/_/g, " ")}\``).join(", ") || "None";

        const fields = [
            { name: "👑 Owner", value: owner ? `${owner.user.tag}\n\`${owner.id}\`` : "Unknown", inline: true },
            { name: "🆔 Server ID", value: `\`${g.id}\``, inline: true },
            { name: "📅 Created", value: created, inline: false },
            {
                name: `👥 Members [${memberCount}]`,
                value: `👤 Humans: **${humanCount}**\n🤖 Bots: **${botCount}**`,
                inline: true,
            },
            {
                name: `📁 Channels [${textCount + voiceCount + stageCount + forumCount}]`,
                value: `💬 Text: **${textCount}**\n🔊 Voice: **${voiceCount}**\n🎤 Stage: **${stageCount}**\n📂 Categories: **${categoryCount}**${forumCount ? `\n💡 Forums: **${forumCount}**` : ""}${threadCount ? `\n🧵 Threads: **${threadCount}**` : ""}`,
                inline: true,
            },
            {
                name: `🎭 Roles [${roleCount}]`,
                value: topRoles + (roleCount > 5 ? `\n*+${roleCount - 5} more*` : ""),
                inline: false,
            },
            {
                name: `😀 Emojis [${emojiCount}]`,
                value: `Static: **${emojiCount - animatedEmojis}**\nAnimated: **${animatedEmojis}**${stickerCount ? `\nStickers: **${stickerCount}**` : ""}`,
                inline: true,
            },
            {
                name: "🚀 Boost Status",
                value: `Tier: **${BOOST_TIERS[g.premiumTier] ?? "None"}**\nBoosts: **${g.premiumSubscriptionCount ?? 0}**`,
                inline: true,
            },
            {
                name: "🔐 Security",
                value: `Verification: ${VERIFICATION_LEVELS[g.verificationLevel] ?? "Unknown"}\nContent Filter: ${CONTENT_FILTER[g.explicitContentFilter] ?? "Unknown"}`,
                inline: false,
            },
        ];

        if (g.vanityURLCode) {
            fields.push({ name: "✨ Vanity URL", value: `discord.gg/${g.vanityURLCode}`, inline: true });
        }
        if (g.preferredLocale) {
            fields.push({ name: "🌐 Locale", value: `\`${g.preferredLocale}\``, inline: true });
        }
        if (g.nsfwLevel != null) {
            fields.push({ name: "🔞 NSFW Level", value: NSFW_LEVEL[g.nsfwLevel] ?? "Unknown", inline: true });
        }
        if (g.description) {
            fields.push({ name: "📝 Description", value: g.description.slice(0, 1024), inline: false });
        }
        if (features !== "None") {
            fields.push({ name: "⭐ Features", value: features.slice(0, 1024), inline: false });
        }

        const embed = buildCoolEmbed({
            guildId: g.id,
            type: "info",
            title: `🏠 ${g.name}`,
            fields,
            showAuthor: true,
            showFooter: false,
            client: i.client,
        });

        if (g.iconURL()) embed.setThumbnail(g.iconURL({ dynamic: true, size: 256 }));
        if (g.bannerURL()) embed.setImage(g.bannerURL({ size: 1024 }));

        embed.setFooter({
            text: `Requested by ${i.user.tag}`,
            iconURL: i.user.displayAvatarURL({ dynamic: true }),
        });

        return safeRespond(i, { embeds: [embed] });
    }
};
