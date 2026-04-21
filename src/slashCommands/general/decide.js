import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";

export default {
    data: {
        name: "decide",
        description: "Pick between options",
        integration_types: [0, 1],
        contexts: [0, 1, 2],
        options: [
            { name: "options", description: "Comma separated options (e.g. Pizza, Sushi, Burger)", type: 3, required: true }
        ]
    },
    async execute(i) {
        const raw = i.options.getString("options");
        const list = raw.split(",").map(s => s.trim()).filter(Boolean);

        if (list.length < 2) {
            return safeRespond(i, { content: "Please provide at least two options separated by commas.", ephemeral: true });
        }

        const choice = list[Math.floor(Math.random() * list.length)];

        return safeRespond(i, asEmbedPayload({
            guildId: i.guild?.id,
            type: "success",
            title: "🤔 I decided...",
            description: `**${choice}**`,
            footerUser: i.user,
            client: i.client,
        }));
    }
};
