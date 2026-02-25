import { Events, PermissionsBitField } from "discord.js";
import { getDB } from "../utils/db.js";
import { getGuildSettings, afkMap, guildAutoresponders, saveSettings } from "../utils/database.js";
import { replyEmbed } from "../utils/embeds.js";
import { containsBadWords, looksSpammy, matchesTrigger, isEmojiResponse, parseHexColorToInt } from "../utils/helpers.js";

const PREFIX = ",";

// Contextual RAG Catch-Up: Sliding Window Buffer
export const messageBuffer = new Map();

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        try {
            if (!message?.content || message.author.bot) return;

            const raw = message.content;
            const lower = raw.toLowerCase();

            // Store message in sliding window buffer (Features 1)
            if (message.guild) {
                const channelId = message.channel.id;
                if (!messageBuffer.has(channelId)) {
                    messageBuffer.set(channelId, []);
                }
                const buffer = messageBuffer.get(channelId);
                buffer.push({
                    author: message.author.username,
                    content: message.content,
                    timestamp: message.createdTimestamp
                });
                if (buffer.length > 100) {
                    buffer.shift();
                }

                // Features 2 & 3: Reputation & Activity Heatmap
                try {
                    const db = await getDB();
                    // 3: Activity Heatmap
                    await db.run("INSERT INTO activity_logs (timestamp) VALUES (?)", message.createdTimestamp);

                    // 2: Reputation System
                    const reputationKeywords = ["fixed", "thanks", "solved"];
                    if (reputationKeywords.some(kw => lower.includes(kw))) {
                        const userId = message.author.id;
                        await db.run(`INSERT INTO reputation (user_id, score) VALUES (?, 1) ON CONFLICT(user_id) DO UPDATE SET score = score + 1`, userId);
                        const row = await db.get("SELECT score FROM reputation WHERE user_id = ?", userId);

                        if (row && row.score === 101) {
                            try {
                                let role = message.guild.roles.cache.find(r => r.name === "Trusted Member");
                                if (!role) {
                                    // Prepare base permissions, adding new ones directly as BigInts or bitfield strings safely
                                    const roleData = {
                                        name: "Trusted Member",
                                        color: 0x57F287,
                                        reason: "Threshold reached for Reputation."
                                    };
                                    role = await message.guild.roles.create(roleData);

                                    // Apply the requested 2026 permissions if supported
                                    try {
                                        let perms = new PermissionsBitField(role.permissions.bitfield);
                                        perms.add("ManageExpressions");
                                        perms.add("BypassSessionsLimits");
                                        await role.setPermissions(perms);
                                    } catch (err) { } // Ignore if discord.js version lacks these typings yet
                                }
                                if (!message.member.roles.cache.has(role.id)) {
                                    await message.member.roles.add(role);
                                    await message.channel.send(`🎉 **${message.author.username}** has reached 100 reputation and unlocked the **Trusted Member** role!`);
                                }
                            } catch (err) {
                                console.error("Failed to assign trusted role:", err);
                            }
                        }
                    }
                } catch (dbErr) {
                    console.error("DB Error in message stats:", dbErr);
                }
            }

            // AFK removal
            const afkEntry = afkMap.get(message.author.id);
            if (afkEntry) {
                afkMap.delete(message.author.id);
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

            // AUTORESPONDERS (not prefix)
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

            // ---------------- EMBED COLOR COMMANDS ----------------
            // Format: ,embed_ticket_#57F287  (command token contains underscores)
            if (commandName.startsWith("embed_")) {
                if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                    return replyEmbed(message, {
                        type: "error",
                        title: "⛔ Permission Needed",
                        description: "You need **Manage Server** to change embed colors.",
                    });
                }

                const parts = commandName.split("_"); // ["embed", "<type>", "<hex>"]
                const type = parts[1];
                const hexPart = parts.slice(2).join("_"); // just in case

                if (!type || !hexPart) {
                    return replyEmbed(message, {
                        type: "error",
                        title: "❌ Invalid Format",
                        description: "Use: `,embed_<type>_#hex`\nExample: `,embed_ticket_#57F287`",
                    });
                }

                const colorInt = parseHexColorToInt(hexPart);
                if (colorInt === null) {
                    return replyEmbed(message, {
                        type: "error",
                        title: "❌ Invalid Color",
                        description: "Hex must look like `#57F287` (6 hex digits).",
                    });
                }

                settings.embedColors[type] = colorInt;
                await saveSettings();

                return replyEmbed(message, {
                    type: "settings",
                    title: "🎨 Embed Color Updated",
                    description: `Set **${type}** embed color to **#${String(hexPart).replace("#", "").toUpperCase()}**.`,
                });
            }

            // Command Loader
            const command = client.prefixCommands.get(commandName) || client.prefixCommands.get(client.aliases.get(commandName));
            if (command) {
                try {
                    await command.execute(message, args, client);
                } catch (error) {
                    console.error("Command execution error:", error);
                    await replyEmbed(message, { type: "error", title: "❌ Error", description: "There was an error while executing this command!" });
                }
            } else {
                // Unknown command (embed)
                return replyEmbed(message, {
                    type: "error",
                    title: "❓ Unknown Command",
                    description: `Command not recognized: \`${PREFIX}${commandName}\`\nTry: \`,modhelp\` or \`,ticket\``,
                });
            }

        } catch (err) {
            console.error("Message handler error:", err);
        }
    }
};
