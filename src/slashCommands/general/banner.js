import { safeRespond } from "../../utils/helpers.js";
import { buildCoolEmbed, asEmbedPayload } from "../../utils/embeds.js";

export default {
    data: {
        name: "banner",
        description: "Show a user's banner in high resolution",
        options: [
            { name: "user", description: "Pick a user", type: 6, required: false }
        ]
    },
    async execute(i) {
        const user = i.options?.getUser?.("user") || i.user;

        const fetched = await i.client.users.fetch(user.id, { force: true }).catch(() => null);
        const bannerUrl = fetched?.bannerURL?.({ size: 1024, dynamic: true }) || null;

        if (!bannerUrl) {
            return safeRespond(i, asEmbedPayload({
                guildId: i.guild?.id,
                type: "info",
                title: "🎨 No Banner",
                description: `${user} hasn't set a profile banner.`,
                ephemeral: true,
            }));
        }

        const formats = ["png", "jpg", "webp", "gif"];
        const isAnimated = bannerUrl.includes(".gif");
        const formatLinks = formats
            .filter(f => f !== "gif" || isAnimated)
            .map(f => `[${f.toUpperCase()}](${fetched.bannerURL({ extension: f, size: 1024 })})`)
            .join(" • ");

        const embed = buildCoolEmbed({
            guildId: i.guild?.id,
            type: "info",
            title: `🎨 ${user.username}'s Banner`,
            description: `${user}`,
            fields: [
                { name: "🖼️ Direct Links", value: formatLinks, inline: false },
                { name: "🔗 Open Original", value: `[Click here](${bannerUrl})`, inline: false },
            ],
            showAuthor: true,
            client: i.client,
        }).setImage(bannerUrl);

        if (fetched.accentColor) embed.setColor(fetched.accentColor);

        embed.setFooter({
            text: `Requested by ${i.user.tag}`,
            iconURL: i.user.displayAvatarURL({ dynamic: true }),
        });

        return safeRespond(i, { embeds: [embed] });
    }
};
