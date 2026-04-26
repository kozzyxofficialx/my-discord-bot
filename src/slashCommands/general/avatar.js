import { safeRespond } from "../../utils/helpers.js";
import { buildCoolEmbed } from "../../utils/embeds.js";

export default {
    data: {
        name: "avatar",
        description: "Show a user's avatar in high resolution",
        options: [
            { name: "user", description: "Pick a user", type: 6, required: false }
        ]
    },
    async execute(i) {
        const user = i.options?.getUser?.("user") || i.user;
        const member = i.guild ? await i.guild.members.fetch(user.id).catch(() => null) : null;

        const globalAvatar = user.displayAvatarURL({ dynamic: true, size: 1024 });
        const serverAvatar = member?.avatar
            ? member.displayAvatarURL({ dynamic: true, size: 1024 })
            : null;

        const formats = ["png", "jpg", "webp", "gif"];
        const isAnimated = globalAvatar.includes(".gif");
        const formatLinks = formats
            .filter(f => f !== "gif" || isAnimated)
            .map(f => `[${f.toUpperCase()}](${user.displayAvatarURL({ extension: f, size: 1024 })})`)
            .join(" • ");

        const fields = [
            { name: "🖼️ Direct Links", value: formatLinks, inline: false },
        ];

        if (serverAvatar && serverAvatar !== globalAvatar) {
            fields.push({
                name: "🏠 Server Avatar",
                value: `[Click here](${serverAvatar})`,
                inline: true,
            });
        }

        fields.push({
            name: "🌐 Global Avatar",
            value: `[Click here](${globalAvatar})`,
            inline: true,
        });

        const embed = buildCoolEmbed({
            guildId: i.guild?.id,
            type: "info",
            title: `🖼️ ${user.username}'s Avatar`,
            description: `${user}`,
            fields,
            showAuthor: true,
            client: i.client,
        }).setImage(serverAvatar || globalAvatar);

        if (user.accentColor) embed.setColor(user.accentColor);

        embed.setFooter({
            text: `Requested by ${i.user.tag}`,
            iconURL: i.user.displayAvatarURL({ dynamic: true }),
        });

        return safeRespond(i, { embeds: [embed] });
    }
};
