import { PermissionsBitField } from "discord.js";
import { replyEmbed, buildCoolEmbed, postCase } from "../../utils/embeds.js";
import { unlockGuild, getRecentRaiders } from "../../utils/raidProtection.js";

export default {
    name: "unraid",
    async execute(message) {
        if (!message.guild) return;
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return replyEmbed(message, {
                type: "error", title: "⛔ Admin Only",
                description: "Only admins can lift a raid lockdown.",
            });
        }

        await unlockGuild(message.guild);

        const raiderCount = getRecentRaiders(message.guild.id).size;

        const embed = buildCoolEmbed({
            guildId: message.guild.id,
            type: "success",
            title: "✅ Lockdown Lifted",
            description: "@everyone can send messages again.",
            fields: raiderCount ? [
                { name: "👥 Detected Raiders", value: `**${raiderCount}** still tracked. Use \`,banraid\` to ban them or \`,raidlist\` to review.`, inline: false },
            ] : [],
            showAuthor: false,
            showFooter: true,
            footerText: `Lifted by ${message.author.tag}`,
        });

        await message.reply({ embeds: [embed] });
        await postCase(message.guild, embed, message.channel.id);
    },
};
