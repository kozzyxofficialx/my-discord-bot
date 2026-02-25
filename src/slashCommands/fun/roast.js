import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { roastLines } from "../../utils/constants.js";

export default {
    data: {
        name: "roast", description: "Roast someone (light)", options: [
            { name: "user", description: "Who to roast", type: 6, required: true }
        ]
    },
    async execute(i) {
        const target = i.options?.getUser?.("user") || i.user;
        const line = roastLines[Math.floor(Math.random() * roastLines.length)];
        return safeRespond(i, asEmbedPayload({
            guildId: i.guild?.id,
            type: "info",
            title: "🔥 Roast",
            description: `**For ${target.username}:**\n${line}`,
            client: i.client,
        }));
    }
};
