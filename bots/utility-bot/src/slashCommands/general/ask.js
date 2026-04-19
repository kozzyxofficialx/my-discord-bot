import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { askClaude, askClaudeWithHistory } from "../../utils/ai.js";
import { getGuildSettings } from "../../utils/database.js";
import { getDB } from "../../utils/db.js";

// Rate limiting: Store user IDs and their cooldown expiry timestamp
const cooldowns = new Map();
const COOLDOWN_SECONDS = 30;
const MAX_HISTORY = 20; // max messages kept per user/guild

// Prune expired entries every 10 minutes to prevent unbounded growth
setInterval(() => {
    const now = Date.now();
    for (const [userId, cooldownEnd] of cooldowns) {
        if (now >= cooldownEnd) cooldowns.delete(userId);
    }
}, 10 * 60 * 1000);

async function loadHistory(userId, guildId) {
    const db = await getDB();
    const row = await db.get(
        "SELECT messages_json FROM conversation_history WHERE user_id = ? AND guild_id = ?",
        userId, guildId
    );
    if (!row) return [];
    try { return JSON.parse(row.messages_json); } catch { return []; }
}

async function saveHistory(userId, guildId, messages) {
    const db = await getDB();
    await db.run(
        "INSERT OR REPLACE INTO conversation_history (user_id, guild_id, messages_json, updated_at) VALUES (?, ?, ?, ?)",
        userId, guildId, JSON.stringify(messages), Date.now()
    );
}

export default {
    data: {
        name: "ask",
        description: "Ask Claude AI a question",
        integration_types: [0, 1],
        contexts: [0, 1, 2],
        options: [
            { name: "prompt", description: "Your question", type: 3, required: true }
        ]
    },
    async execute(i) {
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

        const guildId = i.guild?.id ?? "dm";
        const settings = i.guild ? getGuildSettings(guildId) : null;
        const useHistory = settings?.plugins?.conversation_memory ?? false;

        let answer;

        if (useHistory) {
            const history = await loadHistory(i.user.id, guildId);
            history.push({ role: "user", content: prompt });
            answer = await askClaudeWithHistory(history);

            if (answer && answer !== "ERROR" && answer !== "QUOTA_EXCEEDED") {
                history.push({ role: "assistant", content: answer });
                // Keep last MAX_HISTORY messages
                const trimmed = history.length > MAX_HISTORY ? history.slice(-MAX_HISTORY) : history;
                await saveHistory(i.user.id, guildId, trimmed);
            }
        } else {
            answer = await askClaude(prompt);
        }

        if (!answer || answer === "ERROR") {
            return safeRespond(i, asEmbedPayload({
                guildId: i.guild?.id,
                type: "error",
                title: "❌ AI Error",
                description: "Failed to get a response from Claude. Please try again later.",
                ephemeral: true,
            }));
        }

        if (answer === "QUOTA_EXCEEDED") {
            return safeRespond(i, asEmbedPayload({
                guildId: i.guild?.id,
                type: "error",
                title: "⚠️ Quota Exceeded",
                description: "The bot's AI quota has been reached. Please try again later.",
                ephemeral: true,
            }));
        }

        cooldowns.set(i.user.id, now + (COOLDOWN_SECONDS * 1000));

        const trimmed = answer.length > 4000 ? answer.slice(0, 3997) + "..." : answer;
        const footer = useHistory ? "💬 Conversation memory is ON — Claude remembers this chat." : null;

        return safeRespond(i, asEmbedPayload({
            guildId: i.guild?.id,
            type: "info",
            title: "🤖 Claude Answer",
            description: `**Q:** ${prompt}\n\n${trimmed}`,
            footerUser: footer ? null : i.user,
            client: i.client,
            ...(footer ? { fields: [{ name: "\u200b", value: footer }] } : {}),
        }));
    }
};
