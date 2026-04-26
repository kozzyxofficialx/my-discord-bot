import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { askClaude } from "../../utils/ai.js";

// Rate limiting: Store user IDs and their last command time
const cooldowns = new Map();
const COOLDOWN_SECONDS = 60; // Longer cooldown for summarize

export default {
    data: {
        name: "summarize",
        description: "Summarize the last few messages",
        integration_types: [0, 1],
        contexts: [0, 1, 2],
        options: [
            { name: "limit", description: "Number of messages (default 20, max 50)", type: 4, required: false }
        ]
    },
    async execute(i) {
        if (!i.channel) {
            return safeRespond(i, { content: "Cannot fetch messages in this context.", ephemeral: true });
        }

        // Check cooldown
        const now = Date.now();
        const cooldownEnd = cooldowns.get(i.user.id);

        if (cooldownEnd && now < cooldownEnd) {
            const timeLeft = Math.ceil((cooldownEnd - now) / 1000);
            return safeRespond(i, asEmbedPayload({
                guildId: i.guild?.id,
                type: "error",
                title: "⏰ Cooldown Active",
                description: `Please wait ${timeLeft} seconds before using this command again. Summarization is resource intensive.`,
                ephemeral: true,
            }));
        }

        const limit = Math.min(Math.max(i.options.getInteger("limit") || 20, 5), 50);
        await i.deferReply();

        try {
            const messages = await i.channel.messages.fetch({ limit });
            const transcript = messages.reverse().map(m => `${m.author.username}: ${m.content}`).join("\n");

            if (!transcript.trim()) {
                return safeRespond(i, { content: "No text messages found to summarize.", ephemeral: true });
            }

            const prompt = `Summarize the following Discord conversation concisely:\n\n${transcript}`;
            const summary = await askClaude(prompt);

            if (summary === "BLOCKED") {
                return safeRespond(i, asEmbedPayload({
                    guildId: i.guild?.id,
                    type: "error",
                    title: "🚫 Blocked",
                    description: "The conversation content was blocked due to a safety violation.",
                    ephemeral: true,
                }));
            }

            if (!summary || summary === "ERROR") {
                return safeRespond(i, asEmbedPayload({
                    guildId: i.guild?.id,
                    type: "error",
                    title: "❌ AI Error",
                    description: "Failed to generate summary. Please try again later.",
                    ephemeral: true,
                }));
            }

            if (summary === "QUOTA_EXCEEDED") {
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
                title: "📝 Conversation Summary",
                description: summary,
                footerUser: i.user,
                client: i.client,
            }));

        } catch (e) {
            console.error("Summarize error:", e);
            return safeRespond(i, { content: "Error fetching messages or summarizing.", ephemeral: true });
        }
    }
};
