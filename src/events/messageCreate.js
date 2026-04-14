import { Events, PermissionsBitField } from "discord.js";
import { getGuildSettings, afkMap, guildAutoresponders, saveSettings, clearAfk } from "../utils/database.js";
import { replyEmbed, buildCoolEmbed, postCase, caseEmbed } from "../utils/embeds.js";
import { containsBadWords, looksSpammy, matchesTrigger, isEmojiResponse, parseHexColorToInt } from "../utils/helpers.js";
import { moderateMessage } from "../utils/ai.js";

const PREFIX = ",";

// ─── Built-in AutoMod state ───────────────────────────────────────────────────
// Track recent messages per user for spam detection: userId -> [timestamp, ...]
const userMsgLog = new Map();
// Per-user AI check cooldown (10s) so spammers don't hammer the API
const userAiCooldown = new Map();
// Strike tracker: `${guildId}-${userId}` -> { count, resetAt }
const strikeMap = new Map();

const SPAM_MSG_LIMIT  = 5;    // messages
const SPAM_WINDOW_MS  = 5000; // in 5 seconds
const CAPS_MIN_LEN    = 10;   // only flag if message is this long
const CAPS_THRESHOLD  = 0.75; // 75% caps ratio
const MENTION_LIMIT   = 5;    // @mentions before flagging
const STRIKE_RESET_MS = 10 * 60 * 1000; // strikes reset after 10 min
const STRIKE_TIMEOUT_MS = 10 * 60 * 1000; // 10 min timeout on 3rd strike

// Discord invite link pattern
const INVITE_REGEX = /discord(?:\.gg|app\.com\/invite|\.com\/invite)\/[a-zA-Z0-9\-]+/i;

function getStrikes(guildId, userId) {
    const key = `${guildId}-${userId}`;
    const now = Date.now();
    const data = strikeMap.get(key);
    if (!data || now > data.resetAt) return { count: 0, resetAt: now + STRIKE_RESET_MS };
    return data;
}

function addStrike(guildId, userId) {
    const key = `${guildId}-${userId}`;
    const data = getStrikes(guildId, userId);
    data.count++;
    strikeMap.set(key, data);
    return data.count;
}

// Returns a violation object or null if clean
function runBuiltinAutomod(message, settings) {
    const content = message.content;
    const lower = content.toLowerCase();
    const whitelist = settings.automodWhitelist ?? [];
    const rules = settings.automodRules ?? {};

    // Whitelist: if any whitelisted word appears, skip ALL automod
    if (whitelist.length && whitelist.some(w => lower.includes(w.toLowerCase()))) return null;

    // 1. Discord invite links
    if (rules.invite_links !== false && INVITE_REGEX.test(content)) {
        return { reason: "Discord invite links are not allowed here.", rule: "invite_links" };
    }

    // 2. Mass mentions
    const mentions = message.mentions.users.size + message.mentions.roles.size;
    if (rules.mass_mentions !== false && mentions > MENTION_LIMIT) {
        return { reason: `Mass mention (${mentions} pings in one message).`, rule: "mass_mentions" };
    }

    // 3. Spam — same user sending too many messages too fast
    const now = Date.now();
    const log = (userMsgLog.get(message.author.id) ?? []).filter(t => now - t < SPAM_WINDOW_MS);
    log.push(now);
    userMsgLog.set(message.author.id, log);
    if (rules.spam !== false && log.length > SPAM_MSG_LIMIT) {
        return { reason: "Sending messages too fast.", rule: "spam" };
    }

    // 4. Excessive caps
    if (rules.caps !== false && content.length >= CAPS_MIN_LEN) {
        const letters = content.replace(/[^a-zA-Z]/g, "");
        if (letters.length >= 5) {
            const capsRatio = content.replace(/[^A-Z]/g, "").length / letters.length;
            if (capsRatio >= CAPS_THRESHOLD) {
                return { reason: "Excessive use of caps.", rule: "caps" };
            }
        }
    }

    return null;
}

async function handleAutomodViolation(message, reason, rule, isAI = false) {
    const guild = message.guild;
    await message.delete().catch(() => null);

    const strikeCount = addStrike(guild.id, message.author.id);
    const strikeText = `Strike **${strikeCount}/3**${strikeCount >= 3 ? " — timed out for 10 minutes." : "."}`;

    // Warn in channel (auto-deletes after 7s)
    const warn = await message.channel.send({
        embeds: [buildCoolEmbed({
            guildId: guild.id,
            type: "warning",
            title: `${isAI ? "🤖 AI" : "🛡️"} AutoMod — Message Removed`,
            description: `<@${message.author.id}> your message was removed.\n**Reason:** ${reason}\n${strikeText}`,
        })],
    }).catch(() => null);
    if (warn) setTimeout(() => warn.delete().catch(() => null), 7000);

    // Log to case channel
    await postCase(guild, caseEmbed(guild.id, `${isAI ? "🤖 AI" : "🛡️"} AutoMod — ${rule.replace(/_/g, " ")}`, [
        `**User:** ${message.author.tag} (<@${message.author.id}>)`,
        `**Rule:** ${rule}`,
        `**Reason:** ${reason}`,
        `**Strikes:** ${strikeCount}/3`,
        `**Content:** \`${message.content.slice(0, 200)}\``,
    ]));

    // 3rd strike = timeout
    if (strikeCount >= 3) {
        const member = message.member ?? await guild.members.fetch(message.author.id).catch(() => null);
        if (member && member.moderatable) {
            await member.timeout(STRIKE_TIMEOUT_MS, `AutoMod: 3 strikes — ${reason}`).catch(() => null);
            await postCase(guild, caseEmbed(guild.id, "⏱️ AutoMod — Auto-Timeout (3 strikes)", [
                `**User:** ${message.author.tag} (<@${message.author.id}>)`,
                `**Duration:** 10 minutes`,
                `**Reason:** Accumulated 3 automod strikes.`,
            ]));
        }
        // Reset strikes after timeout
        strikeMap.delete(`${guild.id}-${message.author.id}`);
    }
}

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        try {
            if (!message?.content || message.author.bot) return;

            const raw = message.content;
            const lower = raw.toLowerCase();

            // ── AFK removal ──────────────────────────────────────────────────
            const afkEntry = afkMap.get(message.author.id);
            if (afkEntry) {
                const afkEnabled = !message.guild || getGuildSettings(message.guild.id).plugins?.afk !== false;
                if (afkEnabled) {
                    await clearAfk(message.author.id);
                    await replyEmbed(message, {
                        type: "afk",
                        title: "👋 Welcome Back",
                        description: "Your AFK status has been removed.",
                    }).catch(() => { });
                }
            }

            // ── AFK mention notice ───────────────────────────────────────────
            if (message.mentions.users.size > 0) {
                const afkEnabled = !message.guild || getGuildSettings(message.guild.id).plugins?.afk !== false;
                if (afkEnabled) {
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
            }

            // ── AUTOMOD (non-prefix messages only) ───────────────────────────
            if (message.guild && !raw.startsWith(PREFIX)) {
                const settings = getGuildSettings(message.guild.id);

                // Skip automod for mods
                const memberPerms = message.member?.permissions;
                const isMod = memberPerms && (
                    memberPerms.has(PermissionsBitField.Flags.ManageMessages) ||
                    memberPerms.has(PermissionsBitField.Flags.ModerateMembers) ||
                    memberPerms.has(PermissionsBitField.Flags.Administrator)
                );

                if (!isMod && settings.plugins?.ai_moderation) {
                    // 1. Built-in rules (fast, no API cost)
                    const violation = runBuiltinAutomod(message, settings);
                    if (violation) {
                        await handleAutomodViolation(message, violation.reason, violation.rule, false);
                        return;
                    }

                    // 2. AI moderation — per-user cooldown to avoid API spam
                    const now = Date.now();
                    const lastAiCheck = userAiCooldown.get(message.author.id) ?? 0;
                    if (now - lastAiCheck >= 10_000) {
                        userAiCooldown.set(message.author.id, now);
                        const verdict = await moderateMessage(raw).catch(() => null);
                        if (verdict?.flagged && (verdict.severity === "medium" || verdict.severity === "high")) {
                            await handleAutomodViolation(message, verdict.reason || "Violated community guidelines.", "ai_toxicity", true);
                            return;
                        }
                    }
                }
            }

            // ── AUTORESPONDERS ───────────────────────────────────────────────
            if (!raw.startsWith(PREFIX)) {
                if (!message.guild) return;

                const settings = getGuildSettings(message.guild.id);
                if (settings.plugins?.autoresponders === false) return;
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

            // ── PREFIX COMMANDS ──────────────────────────────────────────────
            if (!message.guild) return;

            // Silently ignore non-mods
            const MOD_PERMS = [
                PermissionsBitField.Flags.Administrator,
                PermissionsBitField.Flags.ManageGuild,
                PermissionsBitField.Flags.ManageChannels,
                PermissionsBitField.Flags.ManageMessages,
                PermissionsBitField.Flags.ManageNicknames,
                PermissionsBitField.Flags.KickMembers,
                PermissionsBitField.Flags.BanMembers,
                PermissionsBitField.Flags.ModerateMembers,
                PermissionsBitField.Flags.ViewAuditLog,
            ];
            if (!MOD_PERMS.some(p => message.member.permissions.has(p))) return;

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

            // Command loader — resolves in order: built-in name → built-in alias → per-guild custom alias
            let command = client.prefixCommands.get(commandName) || client.prefixCommands.get(client.aliases.get(commandName));
            if (!command) {
                const canonical = settings.commandAliases?.[commandName];
                if (canonical) command = client.prefixCommands.get(canonical);
            }
            if (command) {
                // Check if command is disabled for this guild
                if ((settings.disabledCommands?.prefix ?? []).includes(command.name)) {
                    return replyEmbed(message, { type: "error", title: "🚫 Command Disabled", description: `\`,${command.name}\` is disabled in this server.` });
                }
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
