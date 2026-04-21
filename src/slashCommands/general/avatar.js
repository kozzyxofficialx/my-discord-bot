import { safeRespond } from "../../utils/helpers.js";
import { buildCoolEmbed } from "../../utils/embeds.js";

export default {
    data: {
        name: "avatar", description: "Show a user's avatar", options: [
            { name: "user", description: "Pick a user", type: 6, required: false }
        ]
    },
    async execute(i) {
        const user = i.options?.getUser?.("user") || i.user;
        const url = user.displayAvatarURL({ dynamic: true, size: 1024 });

        const embed = buildCoolEmbed({
            guildId: i.guild?.id,
            type: "info",
            title: "🖼️ Avatar",
            description: `${user}
      ${url}`,
            showAuthor: true,
            showFooter: false,
            client: i.client,
        }).setImage(url);

        return safeRespond(i, { embeds: [embed] });
    }
};
