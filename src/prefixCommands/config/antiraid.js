import { PermissionsBitField } from "discord.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";
import { replyEmbed } from "../../utils/embeds.js";
import { parseDurationToMs } from "../../utils/helpers.js";

const ACTIONS = ["lockdown", "kick", "ban"];

function fmtMs(ms) {
    if (!ms || ms <= 0) return "off";
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
}

function showConfig(message, cfg, settings) {
    return replyEmbed(message, {
        type: "settings",
        title: "🛡️ Anti-Raid Config",
        description:
            `**Status:** ${settings.plugins?.anti_raid ? "🟢 Enabled" : "⚫ Disabled"} (\`/plugins enable Anti-Raid\`)\n\n` +
            `\`threshold\`   → **${cfg.threshold}** joins\n` +
            `\`window\`      → **${fmtMs(cfg.windowMs)}**\n` +
            `\`action\`      → **${cfg.action}**\n` +
            `\`minage\`      → **${cfg.minAccountAgeMs > 0 ? fmtMs(cfg.minAccountAgeMs) : "off"}**\n` +
            `\`mention\`     → **${cfg.massMentionThreshold > 0 ? `${cfg.massMentionThreshold} mentions` : "off"}**\n` +
            `\`mentiontime\` → **${fmtMs(cfg.massMentionTimeoutMs)}**\n` +
            `\`alertchannel\` → **${cfg.alertChannelId ? `<#${cfg.alertChannelId}>` : "not set"}**\n\n` +
            `**Subcommands:**\n` +
            "`,antiraid threshold <number>` – Joins to trigger\n" +
            "`,antiraid window <duration>` – Detection window (e.g. 30s, 1m)\n" +
            "`,antiraid action <lockdown|kick|ban>` – Action on raid\n" +
            "`,antiraid minage <duration|off>` – Min account age (e.g. 7d)\n" +
            "`,antiraid mention <number|off>` – Mass-mention threshold\n" +
            "`,antiraid mentiontime <duration>` – Mass-mention timeout\n" +
            "`,antiraid alertchannel <#channel|off>` – Alert channel",
    });
}

export default {
    config: true,
    name: "antiraid",
    aliases: ["ar"],
    async execute(message, args) {
        if (!message.guild) return;
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return replyEmbed(message, { type: "error", title: "⛔ Permission Needed", description: "You need **Manage Server**." });
        }

        const settings = getGuildSettings(message.guild.id);
        const cfg = settings.antiRaid;
        const sub = args[0]?.toLowerCase();

        if (!sub || sub === "show") return showConfig(message, cfg, settings);

        // ── threshold <number>
        if (sub === "threshold") {
            const n = parseInt(args[1]);
            if (!n || n < 2 || n > 200) {
                return replyEmbed(message, { type: "error", title: "❌ Invalid", description: "Threshold must be between **2** and **200**." });
            }
            cfg.threshold = n;
            await saveSettings();
            return replyEmbed(message, { type: "success", title: "✅ Threshold Set", description: `Raid triggers at **${n}** joins.` });
        }

        // ── window <duration>
        if (sub === "window") {
            const ms = parseDurationToMs(args[1]);
            if (!ms || ms < 5000 || ms > 10 * 60_000) {
                return replyEmbed(message, { type: "error", title: "❌ Invalid", description: "Window must be between **5s** and **10m**." });
            }
            cfg.windowMs = ms;
            await saveSettings();
            return replyEmbed(message, { type: "success", title: "✅ Window Set", description: `Detection window: **${fmtMs(ms)}**.` });
        }

        // ── action <lockdown|kick|ban>
        if (sub === "action") {
            const action = args[1]?.toLowerCase();
            if (!ACTIONS.includes(action)) {
                return replyEmbed(message, { type: "error", title: "❌ Invalid", description: `Choose: \`lockdown\`, \`kick\`, or \`ban\`.` });
            }
            cfg.action = action;
            await saveSettings();
            return replyEmbed(message, { type: "success", title: "✅ Action Set", description: `On raid: **${action}**.` });
        }

        // ── minage <duration|off>
        if (sub === "minage") {
            if (args[1]?.toLowerCase() === "off") {
                cfg.minAccountAgeMs = 0;
                await saveSettings();
                return replyEmbed(message, { type: "success", title: "✅ Min Age Disabled", description: "Account-age filter is now off." });
            }
            const ms = parseDurationToMs(args[1]);
            if (!ms || ms < 60_000 || ms > 365 * 86400_000) {
                return replyEmbed(message, { type: "error", title: "❌ Invalid", description: "Use a duration like `1d`, `7d`, `30d`, or `off`." });
            }
            cfg.minAccountAgeMs = ms;
            await saveSettings();
            return replyEmbed(message, { type: "success", title: "✅ Min Age Set", description: `Accounts younger than **${fmtMs(ms)}** will be auto-kicked during spikes.` });
        }

        // ── mention <number|off>
        if (sub === "mention") {
            if (args[1]?.toLowerCase() === "off") {
                cfg.massMentionThreshold = 0;
                await saveSettings();
                return replyEmbed(message, { type: "success", title: "✅ Mass-Mention Disabled", description: "Mass-mention detection is now off." });
            }
            const n = parseInt(args[1]);
            if (!n || n < 2 || n > 50) {
                return replyEmbed(message, { type: "error", title: "❌ Invalid", description: "Threshold must be between **2** and **50**, or `off`." });
            }
            cfg.massMentionThreshold = n;
            await saveSettings();
            return replyEmbed(message, { type: "success", title: "✅ Mention Threshold Set", description: `Auto-timeout triggers at **${n}** mentions in one message.` });
        }

        // ── mentiontime <duration>
        if (sub === "mentiontime") {
            const ms = parseDurationToMs(args[1]);
            if (!ms || ms < 60_000 || ms > 28 * 86400_000) {
                return replyEmbed(message, { type: "error", title: "❌ Invalid", description: "Duration must be between **1m** and **28d**." });
            }
            cfg.massMentionTimeoutMs = ms;
            await saveSettings();
            return replyEmbed(message, { type: "success", title: "✅ Mention Timeout Set", description: `Mass-mentioners get timed out for **${fmtMs(ms)}**.` });
        }

        // ── alertchannel <#channel|off>
        if (sub === "alertchannel") {
            if (args[1]?.toLowerCase() === "off") {
                cfg.alertChannelId = null;
                await saveSettings();
                return replyEmbed(message, { type: "success", title: "✅ Alert Channel Cleared", description: "Raid alerts will only go to the case channel and owner DM." });
            }
            const ch = message.mentions.channels.first();
            if (!ch?.isTextBased()) {
                return replyEmbed(message, { type: "error", title: "❌ Usage", description: "`,antiraid alertchannel #channel` or `,antiraid alertchannel off`" });
            }
            cfg.alertChannelId = ch.id;
            await saveSettings();
            return replyEmbed(message, { type: "success", title: "✅ Alert Channel Set", description: `Raid alerts will post in ${ch}.` });
        }

        return showConfig(message, cfg, settings);
    },
};
