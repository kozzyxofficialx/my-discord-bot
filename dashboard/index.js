import express from "express";
import session from "express-session";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.DASHBOARD_PORT ?? 3000;

const DISCORD_CLIENT_ID     = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI          = process.env.DASHBOARD_REDIRECT_URI ?? `http://localhost:${PORT}/auth/callback`;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
    secret: process.env.SESSION_SECRET ?? "changeme-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
}));

// ── Auth middleware ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
    if (!req.session.user) return res.status(401).json({ error: "Not authenticated" });
    next();
}

// ── Discord OAuth2 ───────────────────────────────────────────────────────────
app.get("/auth/login", (req, res) => {
    const params = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: "code",
        scope: "identify guilds",
    });
    res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

app.get("/auth/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect("/?error=no_code");

    try {
        const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: "authorization_code",
                code,
                redirect_uri: REDIRECT_URI,
            }),
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) return res.redirect("/?error=auth_failed");

        const userRes = await fetch("https://discord.com/api/users/@me", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const user = await userRes.json();

        const guildsRes = await fetch("https://discord.com/api/users/@me/guilds", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const guilds = await guildsRes.json();

        req.session.user   = user;
        req.session.guilds = guilds;
        req.session.token  = tokenData.access_token;

        res.redirect("/dashboard.html");
    } catch (err) {
        console.error("[dashboard] OAuth callback error:", err);
        res.redirect("/?error=server_error");
    }
});

app.get("/auth/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

// ── API ──────────────────────────────────────────────────────────────────────
app.get("/api/me", requireAuth, (req, res) => {
    res.json({ user: req.session.user, guilds: req.session.guilds });
});

app.get("/api/guild/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const userGuilds = req.session.guilds ?? [];
    const guild = userGuilds.find(g => g.id === id && (g.permissions & 0x20) === 0x20);
    if (!guild) return res.status(403).json({ error: "No access to this server" });

    try {
        // Import settings from the bot process (shared SQLite file)
        const { createRequire } = await import("module");
        const { getDB } = await import("../src/utils/db.js");
        const db = await getDB();
        const row = await db.get("SELECT settings_json FROM guild_settings WHERE guild_id = ?", id);
        const settings = row ? JSON.parse(row.settings_json) : {};
        res.json({ guild, settings });
    } catch (err) {
        console.error("[dashboard] /api/guild/:id error:", err);
        res.status(500).json({ error: "Failed to load settings" });
    }
});

app.patch("/api/guild/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const userGuilds = req.session.guilds ?? [];
    const guild = userGuilds.find(g => g.id === id && (g.permissions & 0x20) === 0x20);
    if (!guild) return res.status(403).json({ error: "No access" });

    const { plugins, antiRaid, dynamicVc, appealsChannelId } = req.body;

    try {
        const { getDB } = await import("../src/utils/db.js");
        const db = await getDB();
        const row = await db.get("SELECT settings_json FROM guild_settings WHERE guild_id = ?", id);
        const settings = row ? JSON.parse(row.settings_json) : {};

        if (plugins && typeof plugins === "object") {
            settings.plugins = { ...(settings.plugins ?? {}), ...plugins };
        }
        if (antiRaid && typeof antiRaid === "object") {
            settings.antiRaid = { ...(settings.antiRaid ?? {}), ...antiRaid };
        }
        if (dynamicVc && typeof dynamicVc === "object") {
            settings.dynamicVc = { ...(settings.dynamicVc ?? {}), ...dynamicVc };
        }
        if (typeof appealsChannelId === "string" || appealsChannelId === null) {
            settings.appealsChannelId = appealsChannelId;
        }

        await db.run(
            "INSERT OR REPLACE INTO guild_settings (guild_id, settings_json) VALUES (?, ?)",
            id, JSON.stringify(settings)
        );

        res.json({ ok: true });
    } catch (err) {
        console.error("[dashboard] PATCH /api/guild/:id error:", err);
        res.status(500).json({ error: "Failed to save settings" });
    }
});

app.listen(PORT, () => console.log(`[dashboard] Running at http://localhost:${PORT}`));
