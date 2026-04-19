import { AttachmentBuilder } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { buildCoolEmbed } from "../../utils/embeds.js";

const MODELS = [
    { name: "Flux (default)", value: "flux" },
    { name: "Flux Realism", value: "flux-realism" },
    { name: "Flux Anime", value: "flux-anime" },
    { name: "Flux 3D", value: "flux-3d" },
    { name: "Flux CablyAI", value: "flux-cablyai" },
    { name: "Turbo", value: "turbo" },
];

export default {
    data: {
        name: "imagine",
        description: "Generate an image using Pollinations.ai",
        integration_types: [0, 1],
        contexts: [0, 1, 2],
        options: [
            { name: "prompt", description: "Image description", type: 3, required: true },
            {
                name: "model",
                description: "AI model to use",
                type: 3,
                required: false,
                choices: MODELS,
            },
            { name: "width", description: "Image width (default 1024)", type: 4, required: false, min_value: 256, max_value: 2048 },
            { name: "height", description: "Image height (default 1024)", type: 4, required: false, min_value: 256, max_value: 2048 },
            { name: "seed", description: "Seed for reproducibility", type: 4, required: false },
            { name: "enhance", description: "Enhance prompt with AI", type: 5, required: false },
            { name: "negative", description: "What to avoid in the image", type: 3, required: false },
        ],
    },

    async execute(i) {
        const prompt = i.options.getString("prompt");
        const model = i.options.getString("model") ?? "flux";
        const width = i.options.getInteger("width") ?? 1024;
        const height = i.options.getInteger("height") ?? 1024;
        const seed = i.options.getInteger("seed");
        const enhance = i.options.getBoolean("enhance") ?? false;
        const negative = i.options.getString("negative");

        await i.deferReply();

        const params = new URLSearchParams({
            width: String(width),
            height: String(height),
            model,
            nologo: "true",
            enhance: String(enhance),
        });
        if (seed != null) params.set("seed", String(seed));
        if (negative) params.set("negative", negative);

        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`;

        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

        const fetchWithRetry = async (retries = 3, delay = 4000) => {
            for (let attempt = 1; attempt <= retries; attempt++) {
                const res = await fetch(url);
                if (res.ok) return res;
                if (res.status === 429 && attempt < retries) {
                    await sleep(delay * attempt);
                    continue;
                }
                throw new Error(`Pollinations returned ${res.status}`);
            }
        };

        try {
            const res = await fetchWithRetry();
            const buffer = Buffer.from(await res.arrayBuffer());
            const attachment = new AttachmentBuilder(buffer, { name: "imagine.png" });

            const details = [`**Model:** ${model}`, `**Size:** ${width}x${height}`];
            if (seed != null) details.push(`**Seed:** ${seed}`);
            if (enhance) details.push(`**Enhanced:** Yes`);
            if (negative) details.push(`**Negative:** ${negative}`);

            const embed = buildCoolEmbed({
                guildId: i.guild?.id,
                type: "info",
                title: "🎨 Image Generation",
                description: `**Prompt:** ${prompt}\n${details.join(" • ")}`,
                footerUser: i.user,
                client: i.client,
            }).setImage("attachment://imagine.png");

            return safeRespond(i, { embeds: [embed], files: [attachment] });
        } catch (err) {
            console.error("[imagine]", err);
            const embed = buildCoolEmbed({
                guildId: i.guild?.id,
                type: "error",
                title: "Image Generation Failed",
                description: `Could not generate image. Please try again later.\n\`${err.message}\``,
                footerUser: i.user,
                client: i.client,
            });
            return safeRespond(i, { embeds: [embed] });
        }
    },
};
