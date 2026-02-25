import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { askGemini } from "../../utils/ai.js";

// Rate limiting: Store user IDs and their last command time
const cooldowns = new Map();
const COOLDOWN_SECONDS = 30;

export default {
    data: {
        name: "ask",
        description: "Ask Gemini AI a question",
        integration_types: [0, 1], // Guild, User
        contexts: [0, 1, 2], // Guild, Bot DM, Private Channel
        options: [
            { name: "prompt", description: "Your question", type: 3, required: true }
        ]
    },
    async execute(i) {
        // Check cooldown
        const now = Date.now();
        const cooldownEnd = cooldowns.get(i.user.id);

        if (cooldownEnd && now < cooldownEnd) {
            const timeLeft = Math.ceil((cooldownEnd - now) / 1000);
            return safeRespond(i, asEmbedPayload({
                guildId: i.guild?.id,
                type: "error",
                title: "⏰ Cooldown Active",
                description: `Please wait ${timeLeft} seconds before using this command again.`,
                ephemeral: true,
            }));
        }

        const prompt = i.options.getString("prompt");

        await i.deferReply();

        const answer = await askGemini(prompt);

        if (!answer || answer === "ERROR") {
            return safeRespond(i, asEmbedPayload({
                guildId: i.guild?.id,
                type: "error",
                title: "❌ AI Error",
                description: "Failed to get a response from Gemini. Please try again later.",
                ephemeral: true,
            }));
        }

        if (answer === "QUOTA_EXCEEDED") {
            return safeRespond(i, asEmbedPayload({
                guildId: i.guild?.id,
                type: "error",
                title: "⚠️ Quota Exceeded",
                description: "The bot's AI quota has been reached. Please try again tomorrow or wait a few minutes.",
                ephemeral: true,
            }));
        }

        // Set cooldown after successful response
        cooldowns.set(i.user.id, now + (COOLDOWN_SECONDS * 1000));

        // Discord embed description limit is 4096. Truncate if needed.
        const trimmed = answer.length > 4000 ? answer.slice(0, 3997) + "..." : answer;

        return safeRespond(i, asEmbedPayload({
            guildId: i.guild?.id,
            type: "info",
            title: "🤖 Gemini Answer",
            description: `**Q:** ${prompt}\n\n${trimmed}`,
            footerUser: i.user,
            client: i.client,
        }));
    }
};
