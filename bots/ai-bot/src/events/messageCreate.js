import { Events } from "discord.js";
import { buildCoolEmbed, postCase, caseEmbed } from "../utils/embeds.js";
import { moderateMessage } from "../utils/ai.js";

// Per-channel cooldown for AI moderation to avoid hammering the API
const aiModCooldowns = new Map(); // channelId -> last check timestamp
const AI_MOD_INTERVAL_MS = 3000;   // min 3s between AI checks per channel

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        try {
            if (!message?.content || message.author.bot) return;
            if (!message.guild) return;

            const raw = message.content;

            // ── AI MODERATION (always-on for this bot) ──────────────────────
            const now = Date.now();
            const lastCheck = aiModCooldowns.get(message.channelId) ?? 0;
            if (now - lastCheck < AI_MOD_INTERVAL_MS) return;
            aiModCooldowns.set(message.channelId, now);

            const verdict = await moderateMessage(raw).catch(() => null);
            if (!verdict?.flagged) return;
            if (verdict.severity !== "medium" && verdict.severity !== "high") return;

            await message.delete().catch(() => null);
            await message.channel.send({
                embeds: [buildCoolEmbed({
                    guildId: message.guild.id,
                    type: "warning",
                    title: "🤖 Message Removed",
                    description: `<@${message.author.id}> your message was removed by AI moderation.\n**Reason:** ${verdict.reason || "Violated community guidelines."}`,
                })],
            }).catch(() => null);

            await postCase(message.guild, caseEmbed(message.guild.id, "🤖 AI Moderation — Message Removed", [
                `**User:** ${message.author.tag} (<@${message.author.id}>)`,
                `**Severity:** ${verdict.severity}`,
                `**Reason:** ${verdict.reason}`,
                `**Content:** \`${raw.slice(0, 200)}\``,
            ]));
        } catch (err) {
            console.error("[ai-bot] messageCreate error:", err);
        }
    }
};
