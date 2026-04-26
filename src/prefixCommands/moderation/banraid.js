import { PermissionsBitField } from "discord.js";
import { replyEmbed, buildCoolEmbed, postCase } from "../../utils/embeds.js";
import { getRecentRaiders, clearRecentRaiders } from "../../utils/raidProtection.js";
import { createCase } from "../../utils/moderationUtils.js";

export default {
    name: "banraid",
    async execute(message, args) {
        if (!message.guild) return;
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return replyEmbed(message, {
                type: "error", title: "⛔ Permission Needed",
                description: "You need **Ban Members** permission.",
            });
        }
        if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return replyEmbed(message, {
                type: "error", title: "❌ Bot Missing Permission",
                description: "I need **Ban Members**.",
            });
        }

        const raiders = getRecentRaiders(message.guild.id);
        if (!raiders.size) {
            return replyEmbed(message, {
                type: "info", title: "ℹ️ No Raiders Tracked",
                description: "There are no recently detected raiders to ban.",
            });
        }

        const reason = args.join(" ") || "Mass ban: anti-raid";
        let banned = 0;
        let failed = 0;

        await replyEmbed(message, {
            type: "warning", title: "⏳ Banning Raiders...",
            description: `Attempting to ban **${raiders.size}** detected raiders. This may take a moment.`,
        });

        for (const id of raiders) {
            try {
                await message.guild.members.ban(id, { reason: `${message.author.tag}: ${reason}`, deleteMessageSeconds: 86400 });
                banned++;
            } catch {
                failed++;
            }
        }

        await createCase({
            guild: message.guild, action: "raid_mass_ban",
            target: { id: "0", tag: `${banned} raiders` },
            executor: message.author,
            reason: `${reason} (${banned} banned, ${failed} failed)`,
        });

        clearRecentRaiders(message.guild.id);

        const embed = buildCoolEmbed({
            guildId: message.guild.id,
            type: "mod",
            title: "🔨 Raid Mass-Ban Complete",
            fields: [
                { name: "✅ Banned", value: `**${banned}**`, inline: true },
                { name: "❌ Failed", value: `**${failed}**`, inline: true },
                { name: "👮 Moderator", value: `${message.author}`, inline: true },
                { name: "📝 Reason", value: reason, inline: false },
            ],
            showAuthor: false,
            showFooter: true,
            footerText: `Anti-Raid • ${message.guild.name}`,
        });

        await message.channel.send({ embeds: [embed] });
        await postCase(message.guild, embed, message.channel.id);
    },
};
