import { PermissionsBitField } from "discord.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";
import { replyEmbed, permissionError } from "../../utils/embeds.js";

const RULES = {
    invite_links:  { label: "Invite Links",   description: "Block Discord invite links" },
    mass_mentions: { label: "Mass Mentions",   description: "Block messages with 5+ @mentions" },
    spam:          { label: "Spam",            description: "Block users sending 5+ messages in 5 seconds" },
    caps:          { label: "Excessive Caps",  description: "Block messages that are 75%+ capital letters" },
};

export default {
    name: "automod",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return permissionError(message, "You need **Manage Server** to configure automod rules.");
        }

        const settings = getGuildSettings(message.guild.id);
        settings.automodRules = settings.automodRules ?? {};

        // ,automod list  (or just ,automod)
        if (!args[0] || args[0].toLowerCase() === "list") {
            const lines = Object.entries(RULES).map(([key, meta]) => {
                const enabled = settings.automodRules[key] !== false;
                return `${enabled ? "🟢" : "🔴"} **${meta.label}** — ${meta.description}`;
            });
            return replyEmbed(message, {
                type: "settings",
                title: "🛡️ AutoMod Rules",
                description:
                    lines.join("\n") +
                    "\n\n**Usage:** `,automod <rule> on|off`\n" +
                    "**Rules:** `invite_links` · `mass_mentions` · `spam` · `caps`",
            });
        }

        const rule = args[0].toLowerCase();
        const toggle = (args[1] || "").toLowerCase();

        if (!RULES[rule]) {
            return replyEmbed(message, {
                type: "error",
                title: "❌ Unknown Rule",
                description: `Valid rules: ${Object.keys(RULES).map(r => `\`${r}\``).join(", ")}`,
            });
        }

        if (toggle !== "on" && toggle !== "off") {
            return replyEmbed(message, {
                type: "error",
                title: "❌ Usage",
                description: `\`,automod ${rule} on\` or \`,automod ${rule} off\``,
            });
        }

        const newState = toggle === "on";
        const current = settings.automodRules[rule] !== false;

        if (current === newState) {
            return replyEmbed(message, {
                type: "info",
                title: "ℹ️ No Change",
                description: `**${RULES[rule].label}** is already **${newState ? "enabled" : "disabled"}**.`,
            });
        }

        settings.automodRules[rule] = newState;
        await saveSettings();

        return replyEmbed(message, {
            type: "settings",
            title: `${newState ? "✅ Rule Enabled" : "🔴 Rule Disabled"}`,
            description: `**${RULES[rule].label}** is now **${newState ? "ON 🟢" : "OFF 🔴"}**.\n${RULES[rule].description}.`,
        });
    }
};
