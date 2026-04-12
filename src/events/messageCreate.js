import { Events, PermissionsBitField } from "discord.js";
import { getGuildSettings, afkMap, guildAutoresponders, saveSettings, clearAfk } from "../utils/database.js";
import { replyEmbed, buildCoolEmbed } from "../utils/embeds.js";
import { containsBadWords, looksSpammy, matchesTrigger, isEmojiResponse, parseHexColorToInt } from "../utils/helpers.js";
import { moderateMessage } from "../utils/ai.js";

// Per-channel cooldown for AI moderation to avoid hammering the API
const aiModCooldowns = new Map();
const AI_MOD_INTERVAL_MS = 3000;

const PREFIX = ",";

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        try {
            if (!message?.content || message.author.bot) return;

            const raw = message.content;
            const lower = raw.toLowerCase();

            // AFK removal
            const afkEntry = afkMap.get(message.author.id);
            if (afkEntry) {
                await clearAfk(message.author.id);
                await replyEmbed(message, {
                    type: "afk",
                    title: "👋 Welcome Back",
                    description: "Your AFK status has been removed.",
                }).catch(() => { });
            }

            // Mentioning AFK users
            if (message.mentions.users.size > 0) {
                const lines = [];
                for (const [, user] of message.mentions.users) {
                    const entry = afkMap.get(user.id);
                    if (entry) {
                        const mins = Math.floor((Date.now() - entry.since) / 60000);
                        lines.push(`• **${user.username}** is AFK: **${entry.reason}** (${mins} min)`);
                    }
                }
                if (lines.length > 0) {
                    await replyEmbed(message, {
                        type: "afk",
                        title: "💤 AFK Notice",
                        description: lines.join("\n"),
                    }).catch(() => { });
                }
            }

            // AI MODERATION
            if (message.guild && !raw.startsWith(PREFIX)) {
                const settings = getGuildSettings(message.guild.id);
                if (settings.plugins?.ai_moderation) {
                    const now = Date.now();
                    const lastCheck = aiModCooldowns.get(message.channelId) ?? 0;
                    if (now - lastCheck >= AI_MOD_INTERVAL_MS) {
                        aiModCooldowns.set(message.channelId, now);
                        const verdict = await moderateMessage(raw).catch(() => null);
                        if (verdict?.flagged && (verdict.severity === "medium" || verdict.severity === "high")) {
                            await message.delete().catch(() => null);
                            await message.channel.send({
                                embeds: [buildCoolEmbed({
                                    guildId: message.guild.id,
                                    type: "warning",
                                    title: "🤖 Message Removed",
                                    description: `<@${message.author.id}> your message was removed by auto-moderation.\n**Reason:** ${verdict.reason || "Violated community guidelines."}`,
                                })],
                            }).catch(() => null);
                            const { postCase, caseEmbed } = await import("../utils/embeds.js");
                            await postCase(message.guild, caseEmbed(message.guild.id, "🤖 Auto-Moderation — Message Removed", [
                                `**User:** ${message.author.tag} (<@${message.author.id}>)`,
                                `**Severity:** ${verdict.severity}`,
                                `**Reason:** ${verdict.reason}`,
                                `**Content:** \`${raw.slice(0, 200)}\``,
                            ]));
                            return;
                        }
                    }
                }
            }

            // AUTORESPONDERS (non-prefix messages only)
            if (!raw.startsWith(PREFIX)) {
                if (!message.guild) return;

                const settings = getGuildSettings(message.guild.id);
                const filterOn = settings.autoresponderFilterOn !== false;
                const list = guildAutoresponders.get(message.guild.id) || [];

                if (filterOn) {
                    if (containsBadWords(lower, settings.badWords) || looksSpammy(raw)) return;
                }

                for (const ar of list) {
                    const trig = ar.trigger.toLowerCase();
                    const isMatch = lower === trig || raw.trim().toLowerCase() === trig || matchesTrigger(lower, trig);
                    if (!isMatch) continue;

                    const resp = String(ar.response || "").trim();
                    if (!resp) return;

                    if (isEmojiResponse(resp)) {
                        try { await message.react(resp); } catch { }
                    } else {
                        await replyEmbed(message, {
                            type: "autoresponder",
                            title: "🤖 Auto Response",
                            description: resp,
                        }).catch(() => { });
                    }
                    return;
                }
                return;
            }

            // PREFIX COMMANDS
            if (!message.guild) return;
            const args = raw.slice(PREFIX.length).trim().split(/\s+/);
            const commandName = args.shift()?.toLowerCase();
            if (!commandName) return;

            const settings = getGuildSettings(message.guild.id);

            // Embed color command: ,embed_<type>_#hex
            if (commandName.startsWith("embed_")) {
                if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                    return replyEmbed(message, { type: "error", title: "⛔ Permission Needed", description: "You need **Manage Server** to change embed colors." });
                }
                const parts = commandName.split("_");
                const type = parts[1];
                const hexPart = parts.slice(2).join("_");
                if (!type || !hexPart) {
                    return replyEmbed(message, { type: "error", title: "❌ Invalid Format", description: "Use: `,embed_<type>_#hex`\nExample: `,embed_ticket_#57F287`" });
                }
                const colorInt = parseHexColorToInt(hexPart);
                if (colorInt === null) {
                    return replyEmbed(message, { type: "error", title: "❌ Invalid Color", description: "Hex must look like `#57F287` (6 hex digits)." });
                }
                settings.embedColors[type] = colorInt;
                await saveSettings();
                return replyEmbed(message, { type: "settings", title: "🎨 Embed Color Updated", description: `Set **${type}** embed color to **#${String(hexPart).replace("#", "").toUpperCase()}**.` });
            }

            // Command loader
            const command = client.prefixCommands.get(commandName) || client.prefixCommands.get(client.aliases.get(commandName));
            if (command) {
                try {
                    await command.execute(message, args, client);
                } catch (error) {
                    console.error("Command execution error:", error);
                    await replyEmbed(message, { type: "error", title: "❌ Error", description: "There was an error while executing this command!" });
                }
            } else {
                return replyEmbed(message, {
                    type: "error",
                    title: "❓ Unknown Command",
                    description: `Command not recognized: \`${PREFIX}${commandName}\`\nTry: \`,modhelp\``,
                });
            }

        } catch (err) {
            console.error("Message handler error:", err);
        }
    }
};
