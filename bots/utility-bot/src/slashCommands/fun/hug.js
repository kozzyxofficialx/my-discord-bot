import { safeRespond } from "../../utils/helpers.js";
import { buildCoolEmbed } from "../../utils/embeds.js";
import { hugGifs } from "../../utils/constants.js";

export default {
    data: {
        name: "hug", description: "Hug someone", options: [
            { name: "user", description: "Who to hug", type: 6, required: true }
        ]
    },
    async execute(i) {
        const target = i.options?.getUser?.("user") || i.user;
        const gif = hugGifs[Math.floor(Math.random() * hugGifs.length)];
        const embed = buildCoolEmbed({
            guildId: i.guild?.id,
            type: "success",
            title: `🤗 Hug Time`,
            description: `${i.user.username} hugs ${target.username}!`,
            client: i.client,
        }).setImage(gif);
        return safeRespond(i, { embeds: [embed] });
    }
};
