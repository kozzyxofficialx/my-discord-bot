import { promises as fs } from "fs";
import { Collection } from "discord.js";

// ---------------- FILES ----------------
const SETTINGS_FILE = "./settings.json";
const WARNINGS_FILE = "./warnings.json";
const AUTORESPONDERS_FILE = "./autoresponders.json";
const BOOSTER_DB_FILE = "./boosterroles.json";
const COSMETICS_FILE = "./cosmetics.json";

// ---------------- STATE ----------------
export const serverSettings = new Map(); // guildId -> settings object
export const warnings = new Map(); // `${guildId}-${userId}` -> {count, history[]}
export const guildAutoresponders = new Map(); // guildId -> [{trigger,response}]
export const boosterRolesDB = new Map(); // userId -> roleId
export const afkMap = new Map(); // userId -> {reason, since}
export const cooldowns = new Collection();
export const ticketRate = new Map(); // `${guildId}-${userId}` -> [timestamps]
export const ticketAutoCloseTimers = new Map(); // channelId -> Timeout

// ---------------- IO HELPERS ----------------
async function loadJSON(file, fallback) {
    try {
        const data = await fs.readFile(file, "utf8");
        return JSON.parse(data);
    } catch (err) {
        if (err?.code === "ENOENT") return fallback;
        console.error("Load JSON error:", file, err);
        return fallback;
    }
}
async function saveJSON(file, obj) {
    try {
        const tempFile = `${file}.tmp`;
        await fs.writeFile(tempFile, JSON.stringify(obj, null, 2), "utf8");
        await fs.rename(tempFile, file);
    } catch (err) {
        console.error("Save JSON error:", file, err);
    }
}

// ---------------- SETTINGS ----------------
function defaultTicketConfig() {
    return {
        panelTitle: "🎫 Support Tickets",
        panelText:
            "Pick a category below to open a ticket.\n\n" +
            "Tickets are private.\n" +
            "You can open up to **3 tickets per hour**.",
        categories: [
            { id: "general", label: "📝 General Support", style: "Primary" },
            { id: "report", label: "🚨 Report User", style: "Danger" },
            { id: "bot", label: "🤖 Bot Error", style: "Secondary" },
            { id: "other", label: "❓ Other", style: "Success" },
        ],
        autoCloseMs: 0, // 0 = off
        displayRoleId: null, // shown in ticket message but not pinged
    };
}

function defaultEmbedColors() {
    return {
        info: 0x5865f2,     // default blurple
        success: 0x57f287,  // green
        warning: 0xfaa61a,  // orange
        error: 0xed4245,    // red
        ticket: 0x5865f2,   // ticket replies
        mod: 0xfee75c,      // moderation replies
        case: 0x5865f2,     // case feed
        afk: 0x9b59b6,      // AFK
        autoresponder: 0x2ecc71,
        settings: 0x3498db,
    };
}

export function getGuildSettings(guildId) {
    let s = serverSettings.get(guildId);
    if (!s) {
        s = {
            caseChannelId: null,
            ticketPanelChannelId: null,
            ticket: defaultTicketConfig(),
            autoresponderFilterOn: true,
            applyChannelId: null,
            applicationsOpen: false,
            warnThresholds: [],
            nickLocks: {},
            embedColors: defaultEmbedColors(),
            badWords: [],
            boosterWelcomeBonus: { enabled: true, title: "Server Booster" },
        };
        serverSettings.set(guildId, s);
    }

    if (!s.ticket) s.ticket = defaultTicketConfig();
    if (typeof s.autoresponderFilterOn !== "boolean") s.autoresponderFilterOn = true;
    if (!s.embedColors) s.embedColors = defaultEmbedColors();

    // backfill new keys if missing
    const def = defaultEmbedColors();
    for (const [k, v] of Object.entries(def)) {
        if (typeof s.embedColors[k] !== "number") s.embedColors[k] = v;
    }
    // backfill new keys if missing
    if (!Array.isArray(s.badWords)) s.badWords = [];
    if (!s.boosterWelcomeBonus || typeof s.boosterWelcomeBonus !== "object") {
        s.boosterWelcomeBonus = { enabled: true, title: "Server Booster" };
    } else {
        if (typeof s.boosterWelcomeBonus.enabled !== "boolean") s.boosterWelcomeBonus.enabled = true;
        if (typeof s.boosterWelcomeBonus.title !== "string") s.boosterWelcomeBonus.title = "Server Booster";
    }

    return s;
}

export async function loadSettings() {
    const obj = await loadJSON(SETTINGS_FILE, {});
    serverSettings.clear();
    for (const [guildId, settings] of Object.entries(obj)) {
        serverSettings.set(guildId, settings);
    }
    console.log(`⚙️ Loaded settings for ${serverSettings.size} guild(s).`);
}
export async function saveSettings() {
    const obj = Object.fromEntries(serverSettings.entries());
    await saveJSON(SETTINGS_FILE, obj);
}

// ---------------- WARNINGS ----------------
export function getWarningData(guildId, userId) {
    const key = `${guildId}-${userId}`;
    let data = warnings.get(key);
    if (!data) {
        data = { count: 0, history: [] };
        warnings.set(key, data);
    }
    return data;
}
export async function loadWarnings() {
    const obj = await loadJSON(WARNINGS_FILE, {});
    warnings.clear();
    for (const [k, v] of Object.entries(obj)) warnings.set(k, v);
}
export async function saveWarnings() {
    const obj = Object.fromEntries(warnings.entries());
    await saveJSON(WARNINGS_FILE, obj);
}

// ---------------- AUTORESPONDERS ----------------
export async function loadAutoresponders() {
    const obj = await loadJSON(AUTORESPONDERS_FILE, {});
    guildAutoresponders.clear();
    for (const [guildId, arr] of Object.entries(obj)) {
        if (Array.isArray(arr)) {
            guildAutoresponders.set(
                guildId,
                arr
                    .filter((x) => x?.trigger)
                    .map((x) => ({ trigger: String(x.trigger).toLowerCase(), response: String(x.response ?? "") }))
            );
        }
    }
}
export async function saveAutoresponders() {
    const obj = Object.fromEntries(guildAutoresponders.entries());
    await saveJSON(AUTORESPONDERS_FILE, obj);
}

// ---------------- BOOSTER ROLES ----------------
export async function loadBoosterRoles() {
    const obj = await loadJSON(BOOSTER_DB_FILE, {});
    boosterRolesDB.clear();
    for (const [userId, roleId] of Object.entries(obj)) boosterRolesDB.set(userId, roleId);
}
export async function saveBoosterRoles() {
    const obj = Object.fromEntries(boosterRolesDB.entries());
    await saveJSON(BOOSTER_DB_FILE, obj);
}

// ---------------- COSMETICS ----------------
async function loadKV(file) {
    try {
        const raw = await fs.readFile(file, "utf8");
        const obj = JSON.parse(raw);
        return obj && typeof obj === "object" ? obj : {};
    } catch (err) {
        if (err?.code === "ENOENT") return {};
        console.error("Load KV error:", file, err);
        return {};
    }
}
async function saveKV(file, obj) {
    try {
        const tempFile = `${file}.tmp`;
        await fs.writeFile(tempFile, JSON.stringify(obj, null, 2), "utf8");
        await fs.rename(tempFile, file);
    } catch (err) {
        console.error("Save KV error:", file, err);
    }
}
export async function getUserCosmetics(userId) {
    const db = await loadKV(COSMETICS_FILE);
    const cur = db[userId] && typeof db[userId] === "object" ? db[userId] : {};
    return {
        manualTitle: cur.manualTitle ?? null,
        autoTitle: cur.autoTitle ?? null,
    };
}
export async function setUserCosmetics(userId, patch) {
    const db = await loadKV(COSMETICS_FILE);
    const cur = db[userId] && typeof db[userId] === "object" ? db[userId] : {};
    db[userId] = { ...cur, ...patch };
    await saveKV(COSMETICS_FILE, db);
}
