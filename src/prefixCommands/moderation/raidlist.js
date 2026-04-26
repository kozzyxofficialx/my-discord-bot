import { PermissionsBitField } from "discord.js";
import { replyEmbed, buildCoolEmbed } from "../../utils/embeds.js";
import { getRecentRaiders } from "../../utils/raidProtection.js";

export default {
    name: "raidlist",
    async execute(message) {
        if (!message.guild) return;
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return replyEmbed(message, {
                type: "error", title: "⛔ Permission Needed",
                description: "You need **Ban Members** permission.",
            });
        }

        const raiders = getRecentRaiders(message.guild.id);
        if (!raiders.size) {
            return replyEmbed(message, {
                type: "info", title: "ℹ️ No Raiders Tracked",
                description: "No raiders are currently tracked. The list resets after `,banraid` or after a fresh raid is detected.",
            });
        }

        const ids = [...raiders];
        const lines = ids.slice(0, 30).map((id, idx) => {
            const member = message.guild.members.cache.get(id);
            const tag = member?.user.tag ?? "_unknown_";
            return `**${idx + 1}.** \`${id}\` — ${tag}`;
        });

        const embed = buildCoolEmbed({
            guildId: message.guild.id,
            type: "warning",
            title: `🚨 Tracked Raiders [${raiders.size}]`,
            description: lines.join("\n").slice(0, 4000) + (raiders.size > 30 ? `\n\n*+${raiders.size - 30} more not shown*` : ""),
            fields: [
                { name: "💡 Actions", value: "`,banraid [reason]` — ban all\n`,kick @user` — kick individual", inline: false },
            ],
            showAuthor: true,
            showFooter: true,
            footerText: `Anti-Raid • ${message.guild.name}`,
            client: message.client,
        });

        return message.reply({ embeds: [embed] });
    },
};
