import { safeRespond } from "../../utils/helpers.js";
import { buildCoolEmbed } from "../../utils/embeds.js";

export default {
    data: {
        name: "imagine",
        description: "Generate an image from text",
        integration_types: [0, 1],
        contexts: [0, 1, 2],
        options: [
            { name: "prompt", description: "Image description", type: 3, required: true }
        ]
    },
    async execute(i) {
        const prompt = i.options.getString("prompt");
        // Pollinations.ai simple URL API
        const encoded = encodeURIComponent(prompt);
        const url = `https://image.pollinations.ai/prompt/${encoded}`;

        await i.deferReply();

        const embed = buildCoolEmbed({
            guildId: i.guild?.id,
            type: "info",
            title: "🎨 Image Generation",
            description: `**Prompt:** ${prompt}`,
            footerUser: i.user,
            client: i.client,
        }).setImage(url);

        return safeRespond(i, { embeds: [embed] });
    }
};
