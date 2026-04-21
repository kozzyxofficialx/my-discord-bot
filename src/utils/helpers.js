// ---------------- UTIL: SAFE INTERACTION REPLY ----------------
export async function safeRespond(interaction, payload) {
    // Force ephemeral if error for User Apps (usually safer)
    if (payload.type === "error" && payload.ephemeral === undefined) {
        payload.ephemeral = true;
    }

    try {
        if (interaction.replied || interaction.deferred) {
            return await interaction.editReply(payload);
        } else {
            return await interaction.reply(payload);
        }
    } catch (e) {
        console.error("[safeRespond] Primary method failed:", e);
        try {
            return await interaction.followUp(payload);
        } catch (e2) {
            console.error("[safeRespond] FollowUp failed:", e2);
        }
    }
}
export async function safeUpdate(interaction, payload) {
    try {
        if (interaction.isButton()) return interaction.update(payload);
    } catch {
        try { return safeRespond(interaction, payload); } catch { }
    }
}

// ---------------- TIME PARSER ----------------
export function parseDurationToMs(input) {
    if (!input) return null;
    const s = String(input).trim().toLowerCase();
    if (s === "off") return 0;
    const m = s.match(/^(\d+)(s|m|h|d)$/i);
    if (!m) return null;
    const value = parseInt(m[1], 10);
    if (Number.isNaN(value) || value <= 0) return null;
    const unit = m[2].toLowerCase();
    if (unit === "s") return value * 1000;
    if (unit === "m") return value * 60 * 1000;
    if (unit === "h") return value * 60 * 60 * 1000;
    if (unit === "d") return value * 24 * 60 * 60 * 1000;
    return null;
}

// ---------------- COLOR PARSER ----------------
export function parseHexColorToInt(hex) {
    if (!hex) return null;
    const cleaned = String(hex).trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
    return parseInt(cleaned, 16);
}

// ---------------- AUTORESPONDER MATCHING ----------------
export function matchesTrigger(messageLower, triggerLower) {
    if (!triggerLower) return false;
    if (triggerLower.includes(" ")) return messageLower.includes(triggerLower);
    const escaped = triggerLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "i");
    return re.test(messageLower);
}

export function looksSpammy(text) {
    if (!text) return false;
    const mentionCount = (text.match(/<@/g) || []).length;
    if (mentionCount >= 5) return true;
    if (/(.)\1{9,}/.test(text)) return true;
    const links = (text.match(/https?:\/\/\S+/gi) || []).length;
    if (links >= 3) return true;
    if (text.split(/\s+/).some((w) => w.length >= 60)) return true;
    return false;
}

const DEFAULT_BAD_WORDS = [];
export function containsBadWords(textLower, list = DEFAULT_BAD_WORDS) {
    if (!list.length) return false;
    return list.some((w) => w && textLower.includes(String(w).toLowerCase()));
}

export function isEmojiResponse(str) {
    if (!str) return false;
    const trimmed = str.trim();
    if (/^<a?:[a-zA-Z0-9_]+:\d+>$/.test(trimmed)) return true;
    if (!/\s/.test(trimmed)) {
        const codePoints = Array.from(trimmed);
        if (codePoints.length === 1) return true;
    }
    return false;
}

