import { PermissionsBitField } from "discord.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";
import { replyEmbed } from "../../utils/embeds.js";

const COLOR_TYPES = ["info", "success", "warning", "error", "ticket", "mod", "case", "afk", "autoresponder", "settings"];

const DEFAULT_COLORS = {
    info: 0x5865f2,
    success: 0x57f287,
    warning: 0xfaa61a,
    error: 0xed4245,
    ticket: 0x5865f2,
    mod: 0xfee75c,
    case: 0x5865f2,
    afk: 0x9b59b6,
    autoresponder: 0x2ecc71,
    settings: 0x3498db,
};

function toHex(num) {
    return `#${num.toString(16).toUpperCase().padStart(6, "0")}`;
}

function parseHex(str) {
    const cleaned = str?.replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
    return parseInt(cleaned, 16);
}

export default {
    config: true,
    name: "color",
    aliases: ["embedcolor", "colour"],
    async execute(message, args) {
        if (!message.guild) return;
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return replyEmbed(message, { type: "error", title: "⛔ Permission Needed", description: "You need **Manage Server**." });
        }

        const settings = getGuildSettings(message.guild.id);
        const colors = settings.embedColors;
        const sub = args[0]?.toLowerCase();

        // ── list
        if (!sub || sub === "list") {
            const lines = COLOR_TYPES.map(t => `\`${t.padEnd(13)}\` ${toHex(colors[t])}`).join("\n");
            return replyEmbed(message, {
                type: "settings",
                title: "🎨 Embed Colors",
                description: lines + "\n\n**Usage:**\n`,color set <type> <#hex>` — set a color\n`,color reset [type]` — reset to default",
            });
        }

        // ── set <type> <#hex>
        if (sub === "set") {
            const type = args[1]?.toLowerCase();
            const hex = args[2];
            if (!COLOR_TYPES.includes(type)) {
                return replyEmbed(message, { type: "error", title: "❌ Invalid Type", description: `Valid types: ${COLOR_TYPES.map(t => `\`${t}\``).join(", ")}` });
            }
            const parsed = parseHex(hex);
            if (parsed === null) {
                return replyEmbed(message, { type: "error", title: "❌ Invalid Hex", description: "Use a 6-digit hex code, e.g. `#57F287`." });
            }
            colors[type] = parsed;
            await saveSettings();
            return replyEmbed(message, { type: "success", title: "✅ Color Updated", description: `**${type}** embeds → \`${toHex(parsed)}\`` });
        }

        // ── reset [type]
        if (sub === "reset") {
            const type = args[1]?.toLowerCase();
            if (type && !COLOR_TYPES.includes(type)) {
                return replyEmbed(message, { type: "error", title: "❌ Invalid Type", description: `Valid types: ${COLOR_TYPES.map(t => `\`${t}\``).join(", ")}` });
            }
            if (type) {
                colors[type] = DEFAULT_COLORS[type];
                await saveSettings();
                return replyEmbed(message, { type: "success", title: "✅ Color Reset", description: `**${type}** reset to \`${toHex(DEFAULT_COLORS[type])}\`.` });
            }
            for (const [k, v] of Object.entries(DEFAULT_COLORS)) colors[k] = v;
            await saveSettings();
            return replyEmbed(message, { type: "success", title: "✅ All Colors Reset", description: "All embed colors restored to defaults." });
        }

        return replyEmbed(message, {
            type: "error", title: "❌ Usage",
            description: "`,color list` | `,color set <type> <#hex>` | `,color reset [type]`",
        });
    },
};
