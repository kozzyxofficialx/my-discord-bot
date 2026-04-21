import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { roastLines } from "../../utils/constants.js";

async function askGrok(prompt) {
    try {
        const res = await fetch("https://api.x.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "grok-3-mini",
                messages: [
                    { role: "system", content: "You are a savage but funny roast comedian. Keep it under 3 sentences, no slurs, just clever burns." },
                    { role: "user", content: prompt },
                ],
                max_tokens: 150,
            }),
        });
        const data = await res.json();
        return data?.choices?.[0]?.message?.content ?? null;
    } catch {
        return null;
    }
}

export default {
    data: {
        name: "roast",
        description: "Roast someone with AI",
        options: [
            { name: "user", description: "Who to roast", type: 6, required: true }
        ]
    },
    async execute(i) {
        const target = i.options.getUser("user");

        await i.deferReply();

        let roast = null;
        if (process.env.XAI_API_KEY) {
            roast = await askGrok(`Write a savage roast for a Discord user named "${target.username}".`);
        }

        // Fall back to static lines if Grok fails or key is missing
        if (!roast) {
            roast = roastLines[Math.floor(Math.random() * roastLines.length)];
        }

        return safeRespond(i, asEmbedPayload({
            guildId: i.guild?.id,
            type: "error",
            title: `🔥 ${target.username} got roasted`,
            description: roast,
            client: i.client,
        }));
    }
};
