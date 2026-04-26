import { safeRespond } from "../../utils/helpers.js";
import { buildCoolEmbed, asEmbedPayload } from "../../utils/embeds.js";

const FLAG_BADGES = {
    Staff: "🛡️ Discord Staff",
    Partner: "🤝 Partner",
    Hypesquad: "🎉 HypeSquad Events",
    HypeSquadOnlineHouse1: "🏠 HypeSquad Bravery",
    HypeSquadOnlineHouse2: "🏠 HypeSquad Brilliance",
    HypeSquadOnlineHouse3: "🏠 HypeSquad Balance",
    BugHunterLevel1: "🐛 Bug Hunter",
    BugHunterLevel2: "🐛 Bug Hunter (Gold)",
    PremiumEarlySupporter: "💎 Early Supporter",
    VerifiedDeveloper: "✅ Early Verified Bot Developer",
    CertifiedModerator: "🛡️ Certified Moderator",
    ActiveDeveloper: "👨‍💻 Active Developer",
    VerifiedBot: "🤖 Verified Bot",
};

const STATUS_EMOJI = {
    online: "🟢 Online",
    idle: "🌙 Idle",
    dnd: "⛔ Do Not Disturb",
    offline: "⚫ Offline",
    invisible: "⚫ Invisible",
};

const KEY_PERMS = [
    "Administrator",
    "ManageGuild",
    "ManageRoles",
    "ManageChannels",
    "ManageMessages",
    "BanMembers",
    "KickMembers",
    "ModerateMembers",
    "MentionEveryone",
];

export default {
    data: {
        name: "userinfo",
        description: "Show detailed info about a user",
        options: [
            { name: "user", description: "Pick a user", type: 6, required: false }
        ]
    },
    async execute(i) {
        const user = await (i.options?.getUser?.("user") || i.user).fetch().catch(() => i.options?.getUser?.("user") || i.user);
        const member = i.guild ? await i.guild.members.fetch(user.id).catch(() => null) : null;

        const created = `<t:${Math.floor(user.createdTimestamp / 1000)}:F> (<t:${Math.floor(user.createdTimestamp / 1000)}:R>)`;
        const joined = member?.joinedTimestamp
            ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`
            : "N/A";

        const flags = user.flags?.toArray?.() ?? [];
        const badges = flags.map(f => FLAG_BADGES[f]).filter(Boolean);
        if (user.bot) badges.unshift("🤖 Bot");
        if (member?.premiumSince) badges.push("💎 Server Booster");

        const roles = member
            ? member.roles.cache
                .filter((r) => r.id !== i.guild.id)
                .sort((a, b) => b.position - a.position)
                .map((r) => r.toString())
            : [];

        const keyPerms = member?.permissions?.toArray?.()?.filter(p => KEY_PERMS.includes(p)) ?? [];

        const status = member?.presence?.status ? STATUS_EMOJI[member.presence.status] : null;
        const activity = member?.presence?.activities?.[0];
        const activityText = activity ? `${activity.type === 4 ? "💬" : "🎮"} ${activity.state || activity.name}` : null;

        const fields = [
            { name: "👤 Username", value: `\`${user.username}\``, inline: true },
            { name: "🆔 User ID", value: `\`${user.id}\``, inline: true },
            { name: "🤖 Bot", value: user.bot ? "Yes" : "No", inline: true },
            { name: "📅 Account Created", value: created, inline: false },
        ];

        if (member) {
            fields.push({ name: "📥 Joined Server", value: joined, inline: false });
            if (member.nickname) fields.push({ name: "📝 Nickname", value: member.nickname, inline: true });
            if (status) fields.push({ name: "🌐 Status", value: status, inline: true });
            if (member.premiumSinceTimestamp) {
                fields.push({ name: "💎 Boosting Since", value: `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>`, inline: true });
            }
            if (activityText) fields.push({ name: "🎯 Activity", value: activityText, inline: false });
        }

        if (badges.length) {
            fields.push({ name: "🏅 Badges", value: badges.join("\n"), inline: false });
        }

        if (roles.length) {
            const rolesValue = roles.slice(0, 25).join(" ") + (roles.length > 25 ? `\n*+${roles.length - 25} more*` : "");
            fields.push({ name: `🎭 Roles [${roles.length}]`, value: rolesValue.slice(0, 1024), inline: false });
        }

        if (keyPerms.length) {
            fields.push({ name: "🔑 Key Permissions", value: keyPerms.map(p => `\`${p}\``).join(", "), inline: false });
        }

        const embed = buildCoolEmbed({
            guildId: i.guild?.id,
            type: "info",
            title: "👤 User Information",
            description: `${user}`,
            fields,
            showAuthor: true,
            showFooter: false,
            client: i.client,
        });

        embed.setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }));

        const banner = user.bannerURL?.({ size: 1024, dynamic: true });
        if (banner) embed.setImage(banner);

        if (user.accentColor) embed.setColor(user.accentColor);
        else if (member?.displayHexColor && member.displayHexColor !== "#000000") embed.setColor(member.displayHexColor);

        embed.setFooter({
            text: `Requested by ${i.user.tag}`,
            iconURL: i.user.displayAvatarURL({ dynamic: true }),
        });

        return safeRespond(i, { embeds: [embed] });
    }
};
