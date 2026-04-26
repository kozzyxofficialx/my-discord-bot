import { PermissionsBitField } from "discord.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";
import { replyEmbed } from "../../utils/embeds.js";

const MAX_WORDS = 200;
const MAX_WORD_LEN = 50;

export default {
    config: true,
    name: "badwords",
    aliases: ["bw", "filter"],
    async execute(message, args) {
        if (!message.guild) return;
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return replyEmbed(message, { type: "error", title: "⛔ Permission Needed", description: "You need **Manage Server**." });
        }

        const settings = getGuildSettings(message.guild.id);
        const sub = args[0]?.toLowerCase();

        // ── list
        if (!sub || sub === "list") {
            const list = settings.badWords;
            if (!list.length) {
                return replyEmbed(message, {
                    type: "info", title: "🚫 Bad Words Filter",
                    description: "No words in the filter yet.\n\n**Usage:**\n`,badwords add <word>` – add a word\n`,badwords remove <word>` – remove a word\n`,badwords clear` – clear all",
                });
            }
            const chunks = [];
            let current = "";
            for (const w of list) {
                const part = `\`${w}\`  `;
                if (current.length + part.length > 3800) { chunks.push(current); current = ""; }
                current += part;
            }
            if (current) chunks.push(current);
            return replyEmbed(message, {
                type: "info",
                title: `🚫 Bad Words Filter [${list.length}/${MAX_WORDS}]`,
                description: chunks[0],
            });
        }

        // ── add <word>
        if (sub === "add") {
            const word = args.slice(1).join(" ").toLowerCase().trim();
            if (!word) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "`,badwords add <word>`" });
            if (word.length > MAX_WORD_LEN) return replyEmbed(message, { type: "error", title: "❌ Too Long", description: `Max **${MAX_WORD_LEN}** characters per word.` });
            if (settings.badWords.length >= MAX_WORDS) return replyEmbed(message, { type: "error", title: "❌ List Full", description: `Maximum **${MAX_WORDS}** words.` });
            if (settings.badWords.includes(word)) return replyEmbed(message, { type: "warning", title: "⚠️ Already Exists", description: `\`${word}\` is already in the filter.` });
            settings.badWords.push(word);
            await saveSettings();
            return replyEmbed(message, { type: "success", title: "✅ Word Added", description: `\`${word}\` added to the filter. [${settings.badWords.length}/${MAX_WORDS}]` });
        }

        // ── remove <word>
        if (sub === "remove") {
            const word = args.slice(1).join(" ").toLowerCase().trim();
            if (!word) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "`,badwords remove <word>`" });
            const idx = settings.badWords.indexOf(word);
            if (idx === -1) return replyEmbed(message, { type: "error", title: "❌ Not Found", description: `\`${word}\` is not in the filter.` });
            settings.badWords.splice(idx, 1);
            await saveSettings();
            return replyEmbed(message, { type: "success", title: "✅ Word Removed", description: `\`${word}\` removed from the filter.` });
        }

        // ── clear
        if (sub === "clear") {
            const count = settings.badWords.length;
            settings.badWords = [];
            await saveSettings();
            return replyEmbed(message, { type: "success", title: "🧹 Filter Cleared", description: `Removed **${count}** word(s).` });
        }

        return replyEmbed(message, {
            type: "error", title: "❌ Usage",
            description: "`,badwords list` | `,badwords add <word>` | `,badwords remove <word>` | `,badwords clear`",
        });
    },
};
