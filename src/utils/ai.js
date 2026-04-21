import Anthropic from "@anthropic-ai/sdk";

let client;

function getClient() {
    if (!client) {
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error("Missing ANTHROPIC_API_KEY in .env");
        }
        client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    return client;
}

// Generic wrapper — accepts a messages array and optional system prompt
async function callClaude(messages, { model = "claude-haiku-4-5-20251001", maxTokens = 1024, system = null } = {}) {
    try {
        const anthropic = getClient();
        const params = { model, max_tokens: maxTokens, messages };
        if (system) params.system = system;
        const response = await anthropic.messages.create(params);
        return response.content[0].text;
    } catch (error) {
        console.error("Claude API Error:", error.status, error.message);
        if (error instanceof Anthropic.RateLimitError) return "QUOTA_EXCEEDED";
        if (error instanceof Anthropic.InternalServerError && error.status === 529) return "QUOTA_EXCEEDED";
        return "ERROR";
    }
}

// ── /ask: stateless single-turn ──────────────────────────────────────────────
export async function askClaude(prompt, modelName = "claude-haiku-4-5-20251001") {
    return callClaude([{ role: "user", content: prompt }], { model: modelName });
}

// ── /ask: multi-turn with conversation history ────────────────────────────────
export async function askClaudeWithHistory(messages, modelName = "claude-haiku-4-5-20251001") {
    return callClaude(messages, {
        model: modelName,
        maxTokens: 1024,
        system: "You are a helpful assistant in a Discord bot. Be concise and conversational.",
    });
}

// ── AI Moderation ─────────────────────────────────────────────────────────────
// Returns { flagged: bool, reason: string, severity: 'low'|'medium'|'high' }
export async function moderateMessage(content) {
    const result = await callClaude(
        [{
            role: "user",
            content: `Analyze this Discord message for harmful content. Reply with ONLY valid JSON, no markdown.\n\nMessage: ${JSON.stringify(content)}\n\nRespond: {"flagged": bool, "reason": "brief reason or empty string", "severity": "low|medium|high"}`,
        }],
        { model: "claude-haiku-4-5-20251001", maxTokens: 128 }
    );

    if (result === "ERROR" || result === "QUOTA_EXCEEDED") return { flagged: false, reason: "", severity: "low" };

    try {
        const cleaned = result.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        return {
            flagged: Boolean(parsed.flagged),
            reason: String(parsed.reason || ""),
            severity: ["low", "medium", "high"].includes(parsed.severity) ? parsed.severity : "low",
        };
    } catch {
        return { flagged: false, reason: "", severity: "low" };
    }
}

// ── Ticket Summary ────────────────────────────────────────────────────────────
// messages: [{author: string, content: string}]
export async function summarizeTicket(messages) {
    if (!messages.length) return "No messages to summarize.";
    const transcript = messages
        .map(m => `${m.author}: ${m.content}`)
        .join("\n");

    return callClaude(
        [{
            role: "user",
            content: `Summarize this Discord support ticket transcript in 3-5 bullet points. Be concise.\n\n${transcript}`,
        }],
        { model: "claude-haiku-4-5-20251001", maxTokens: 512 }
    );
}

// ── Server Rules Generator ────────────────────────────────────────────────────
export async function generateServerRules(serverInfo) {
    const { name, channelNames, roleNames, memberCount } = serverInfo;
    return callClaude(
        [{
            role: "user",
            content: `Generate a complete, professional set of Discord server rules for a server named "${name}" with ~${memberCount} members.\n\nChannels: ${channelNames.join(", ")}\nRoles: ${roleNames.join(", ")}\n\nFormat as a numbered list. Be firm but friendly. Include rules about: respect, spam, NSFW, self-promo, and anything implied by the channel names. Return ONLY the rules text, no intro paragraph.`,
        }],
        { model: "claude-haiku-4-5-20251001", maxTokens: 1024 }
    );
}
