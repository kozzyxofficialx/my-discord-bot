// ========================================================================
//  /redo_server_setup  —  Wipe everything server_setup created & optionally redo it
// ========================================================================
//  Deletes all roles and channels that /server_setup creates, clears bot
//  settings (case channel, ticket panel channel), then optionally re-runs
//  a preset automatically.
//
//  Options:
//    • confirm      (required) — must be True, safety gate
//    • rerun_preset (optional) — if set, runs /server_setup with that preset after wiping
// ========================================================================

import {
    ChannelType,
    PermissionFlagsBits,
    PermissionsBitField,
    EmbedBuilder,
} from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { buildCoolEmbed, asEmbedPayload } from "../../utils/embeds.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";

const P = PermissionFlagsBits;

// All role names server_setup creates — keep in sync with server_setup.js
const SETUP_ROLE_NAMES = new Set([
    "👑 Owner", "🛡️ Admin", "⚔️ Moderator", "🧰 Helper",
    "💎 VIP", "💜 Booster", "⭐ Active Member",
    "🧍 Member", "🤖 Bots", "🔇 Muted",
]);

// All channel/category names server_setup creates — keep in sync with server_setup.js
const SETUP_CATEGORY_NAMES = new Set([
    "📢 INFORMATION", "💬 COMMUNITY", "🎮 GAMING",
    "🎧 VOICE", "🎫 SUPPORT", "🛠️ STAFF",
]);
const SETUP_CHANNEL_NAMES = new Set([
    // information
    "welcome", "rules", "announcements", "server-updates",
    // community
    "general", "introductions", "media", "memes", "bot-commands",
    // gaming
    "lfg", "gaming-chat", "clips",
    // voice
    "🔊 General Lounge", "🎵 Music", "🎮 Gaming VC", "😴 AFK",
    // support
    "support", "suggestions", "bug-reports",
    // staff
    "staff-chat", "mod-log", "cases", "🛠️ Staff VC",
]);

const PRESET_CHOICES = [
    { name: "Full Community Server",    value: "full" },
    { name: "Community / Chat Server",  value: "community" },
    { name: "Gaming Community",         value: "gaming" },
    { name: "Minimal / Private Server", value: "minimal" },
    { name: "Staff Tools Only",         value: "staff_only" },
];

export default {
    data: {
        name: "redo_server_setup",
        description: "Delete everything server_setup created and optionally redo it.",
        default_member_permissions: String(PermissionsBitField.Flags.ManageGuild),
        dm_permission: false,
        options: [
            {
                name: "confirm",
                description: "Must be True — confirms you want to wipe all setup roles and channels.",
                type: 5, // BOOLEAN
                required: true,
            },
            {
                name: "rerun_preset",
                description: "After wiping, immediately re-run setup with this preset.",
                type: 3, // STRING
                required: false,
                choices: PRESET_CHOICES,
            },
        ],
    },

    async execute(interaction) {
        if (!interaction.guildId) {
            return safeRespond(interaction, asEmbedPayload({
                guildId: null, type: "error",
                title: "❌ Server Only",
                description: "This command can only be used in a server.",
                ephemeral: true,
            }));
        }

        const guild = interaction.guild || await interaction.client.guilds.fetch(interaction.guildId).catch(() => null);
        if (!guild) {
            return safeRespond(interaction, asEmbedPayload({
                guildId: null, type: "error",
                title: "❌ Cannot Access Server",
                description: "I couldn't load this server.",
                ephemeral: true,
            }));
        }

        // Perm check
        const invoker = interaction.member;
        if (!invoker?.permissions?.has(P.ManageGuild) && !invoker?.permissions?.has(P.Administrator)) {
            return safeRespond(interaction, asEmbedPayload({
                guildId: guild.id, type: "error",
                title: "❌ Insufficient Permissions",
                description: "You need the **Manage Server** permission to run this.",
                ephemeral: true,
            }));
        }

        const confirmed   = interaction.options.getBoolean("confirm");
        const rerunPreset = interaction.options.getString("rerun_preset");

        // Safety gate
        if (!confirmed) {
            return safeRespond(interaction, asEmbedPayload({
                guildId: guild.id, type: "warning",
                title: "⚠️ Cancelled",
                description: "You must set `confirm` to **True** to wipe the server setup.\n\nNothing was changed.",
                ephemeral: true,
            }));
        }

        // Bot perm check
        const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
        const missing = [P.ManageChannels, P.ManageRoles].filter((p) => !me?.permissions?.has(p));
        if (missing.length) {
            return safeRespond(interaction, asEmbedPayload({
                guildId: guild.id, type: "error",
                title: "❌ Bot Missing Permissions",
                description: "I need **Manage Channels** and **Manage Roles** to undo the setup.",
                ephemeral: true,
            }));
        }

        await interaction.deferReply({ ephemeral: false });

        const log = [];
        let deletedChannels = 0;
        let deletedCategories = 0;
        let deletedRoles = 0;

        try {
            // 1. Delete text/voice channels first (can't delete non-empty categories)
            for (const ch of guild.channels.cache.values()) {
                if (ch.type === ChannelType.GuildCategory) continue;
                if (SETUP_CHANNEL_NAMES.has(ch.name)) {
                    try {
                        await ch.delete("redo_server_setup");
                        deletedChannels++;
                    } catch { /* skip if already gone or no perms */ }
                }
            }

            // 2. Delete categories (now empty)
            for (const ch of guild.channels.cache.values()) {
                if (ch.type !== ChannelType.GuildCategory) continue;
                if (SETUP_CATEGORY_NAMES.has(ch.name)) {
                    try {
                        await ch.delete("redo_server_setup");
                        deletedCategories++;
                    } catch { /* skip */ }
                }
            }

            // 3. Delete roles (skip @everyone and roles higher than the bot)
            const botRole = me?.roles?.highest;
            for (const role of guild.roles.cache.values()) {
                if (!SETUP_ROLE_NAMES.has(role.name)) continue;
                if (role.managed || role.id === guild.id) continue;
                if (botRole && role.position >= botRole.position) {
                    log.push(`⚠️ Skipped **${role.name}** (higher than my role — drag me above it).`);
                    continue;
                }
                try {
                    await role.delete("redo_server_setup");
                    deletedRoles++;
                } catch { /* skip */ }
            }

            // 4. Clear bot settings
            const settings = getGuildSettings(guild.id);
            settings.caseChannelId = null;
            settings.ticketPanelChannelId = null;
            await saveSettings().catch(() => {});

            log.unshift(
                `🗑️ Deleted **${deletedChannels}** channel(s), **${deletedCategories}** categor(ies), **${deletedRoles}** role(s).`,
                `⚙️ Cleared case channel and ticket panel channel settings.`,
            );
        } catch (err) {
            console.error("[redo_server_setup] Error:", err);
            log.push(`❌ Fatal error: \`${err?.message || err}\``);
        }

        // Build result embed
        const presetLabel = PRESET_CHOICES.find(p => p.value === rerunPreset)?.name;
        const embed = buildCoolEmbed({
            guildId: guild.id,
            type: "warning",
            title: "🗑️ Server Setup Wiped",
            description: "All server_setup roles and channels have been removed." +
                (rerunPreset ? `\n\n➡️ Now run \`/server_setup preset:${presetLabel}\` to set it back up.` : ""),
            fields: [{ name: "📋 Summary", value: log.join("\n") || "*(nothing to remove)*" }],
            showAuthor: true,
            client: interaction.client,
        });

        return safeRespond(interaction, { embeds: [embed] });
    },
};
