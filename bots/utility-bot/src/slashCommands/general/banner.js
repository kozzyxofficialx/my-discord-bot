import { safeRespond } from "../../utils/helpers.js";
import { buildCoolEmbed, asEmbedPayload } from "../../utils/embeds.js";

export default {
    data: {
        name: "banner", description: "Show a user's banner", options: [
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
                title: "🖼️ Banner",
                description: `${user} doesn't have a banner set.`,
                ephemeral: true,
            }));
        }

        const embed = buildCoolEmbed({
            guildId: i.guild?.id,
            type: "info",
            title: "🖼️ Banner",
            description: `${user}
      ${bannerUrl}`,
            showAuthor: true,
            showFooter: false,
            client: i.client,
        }).setImage(bannerUrl);

        return safeRespond(i, { embeds: [embed] });
    }
};
