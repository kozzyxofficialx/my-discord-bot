import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { askClaude } from "../../utils/ai.js";

// Rate limiting: Store user IDs and their last command time
const cooldowns = new Map();
const COOLDOWN_SECONDS = 30;

export default {
    data: {
        name: "translate",
        description: "Translate text using AI",
        integration_types: [0, 1],
        contexts: [0, 1, 2],
        options: [
            { name: "text", description: "Text to translate", type: 3, required: true },
            { name: "to", description: "Target language (e.g. English, Hungarian)", type: 3, required: true }
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

        const text = i.options.getString("text");
        const to = i.options.getString("to");

        await i.deferReply();

        const prompt = `Translate the following text to ${to}. Only provide the translation, nothing else.\n\nText: ${text}`;
        const translation = await askClaude(prompt);

        if (!translation || translation === "ERROR") {
            return safeRespond(i, asEmbedPayload({
                guildId: i.guild?.id,
                type: "error",
                title: "❌ AI Error",
                description: "Translation failed. Please try again later.",
                ephemeral: true,
            }));
        }

        if (translation === "QUOTA_EXCEEDED") {
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

        return safeRespond(i, asEmbedPayload({
            guildId: i.guild?.id,
            type: "info",
            title: `🌍 Translate to ${to}`,
            description: `**Original:**\n${text}\n\n**Translation:**\n${translation}`,
            footerUser: i.user,
            client: i.client,
        }));
    }
};
