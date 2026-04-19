// ========================================================================
//  /wipe_server  —  Nuclear option: delete ALL roles and channels
// ========================================================================
//  Only the server OWNER can run this. Not admins, not mods — owner only.
//  Deletes every channel, category, and role (except @everyone and roles
//  the bot can't touch).
//
//  Options:
//    • confirm_name (required) — must type the exact server name as a safety gate
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

export default {
    data: {
        name: "wipe_server",
        description: "⚠️ DANGER: Delete ALL channels and roles. Server owner only.",
        default_member_permissions: String(PermissionsBitField.Flags.Administrator),
        dm_permission: false,
        options: [
            {
                name: "confirm_name",
                description: "Type the exact server name to confirm. This cannot be undone.",
                type: 3, // STRING
                required: true,
            },
            {
                name: "dry_run",
                description: "Preview what will be deleted without actually doing it.",
                type: 5, // BOOLEAN
                required: false,
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

        // OWNER ONLY — not admin, not manage server. Owner only.
        if (interaction.user.id !== guild.ownerId) {
            return safeRespond(interaction, asEmbedPayload({
                guildId: guild.id, type: "error",
                title: "❌ Owner Only",
                description: "Only the **server owner** can run this command.",
                ephemeral: true,
            }));
        }

        const dryRun = interaction.options.getBoolean("dry_run") ?? false;

        // Confirm by typing the exact server name
        const confirmName = interaction.options.getString("confirm_name");
        if (confirmName !== guild.name) {
            return safeRespond(interaction, asEmbedPayload({
                guildId: guild.id, type: "error",
                title: "❌ Wrong Server Name",
                description: `You typed \`${confirmName}\` but the server name is \`${guild.name}\`.\n\nType it exactly — including capitals and spaces.`,
                ephemeral: true,
            }));
        }

        // Bot perm check
        const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
        const missing = [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles].filter(
            (p) => !me?.permissions?.has(p)
        );
        if (missing.length) {
            return safeRespond(interaction, asEmbedPayload({
                guildId: guild.id, type: "error",
                title: "❌ Bot Missing Permissions",
                description: "I need **Manage Channels** and **Manage Roles** to wipe the server.",
                ephemeral: true,
            }));
        }

        // Dry run: show what would be deleted without touching anything
        if (dryRun) {
            const botHighest = me?.roles?.highest;
            const channels = [...guild.channels.cache.values()];
            const roles = [...guild.roles.cache.values()].filter(r =>
                r.id !== guild.id &&
                !r.managed &&
                !(botHighest && r.position >= botHighest.position)
            );
            const skippedRoles = [...guild.roles.cache.values()].filter(r =>
                r.id !== guild.id && (r.managed || (botHighest && r.position >= botHighest.position))
            );

            const lines = [
                `🗑️ Would delete **${channels.length}** channel(s) and categor(ies).`,
                `🎭 Would delete **${roles.length}** role(s).`,
                `⚙️ Would clear bot settings (case channel, ticket panel).`,
                skippedRoles.length ? `⏭️ Would skip: ${skippedRoles.map(r => `@${r.name}`).slice(0, 5).join(", ")}${skippedRoles.length > 5 ? ` +${skippedRoles.length - 5} more` : ""} (managed/above bot)` : null,
            ].filter(Boolean);

            return safeRespond(interaction, asEmbedPayload({
                guildId: guild.id,
                type: "warning",
                title: "🧪 Dry Run — Wipe Preview",
                description: `**No changes were made.** Re-run without \`dry_run\` to execute.\n\n${lines.join("\n")}`,
                ephemeral: true,
            }));
        }

        await interaction.deferReply({ ephemeral: false });

        let deletedChannels = 0;
        let deletedRoles = 0;
        const skipped = [];

        try {
            // 1. Delete all non-category channels first
            for (const ch of [...guild.channels.cache.values()]) {
                if (ch.type === ChannelType.GuildCategory) continue;
                try {
                    await ch.delete("wipe_server command");
                    deletedChannels++;
                } catch {
                    skipped.push(`#${ch.name} (channel)`);
                }
            }

            // 2. Delete all categories (now empty)
            for (const ch of [...guild.channels.cache.values()]) {
                if (ch.type !== ChannelType.GuildCategory) continue;
                try {
                    await ch.delete("wipe_server command");
                    deletedChannels++;
                } catch {
                    skipped.push(`${ch.name} (category)`);
                }
            }

            // 3. Delete all roles except @everyone, managed roles, and roles above the bot
            const botHighest = me?.roles?.highest;
            for (const role of [...guild.roles.cache.values()]) {
                if (role.id === guild.id) continue;           // @everyone
                if (role.managed) continue;                   // bot/integration roles
                if (botHighest && role.position >= botHighest.position) {
                    skipped.push(`@${role.name} (above my role)`);
                    continue;
                }
                try {
                    await role.delete("wipe_server command");
                    deletedRoles++;
                } catch {
                    skipped.push(`@${role.name} (role)`);
                }
            }

            // 4. Clear bot settings
            const settings = getGuildSettings(guild.id);
            settings.caseChannelId = null;
            settings.ticketPanelChannelId = null;
            await saveSettings().catch(() => {});

        } catch (err) {
            console.error("[wipe_server] Fatal error:", err);
        }

        // Try to create a single channel to respond in (the server is now empty)
        let responseChannel = null;
        try {
            responseChannel = await guild.channels.create({
                name: "bot",
                type: ChannelType.GuildText,
                reason: "wipe_server — created for response",
            });
        } catch { /* if this fails too, followUp will handle it */ }

        const lines = [
            `🗑️ Deleted **${deletedChannels}** channel(s) and categor(ies).`,
            `🎭 Deleted **${deletedRoles}** role(s).`,
            `⚙️ Cleared bot settings.`,
            skipped.length ? `⚠️ Skipped: ${skipped.slice(0, 5).join(", ")}${skipped.length > 5 ? ` +${skipped.length - 5} more` : ""}` : null,
        ].filter(Boolean);

        const embed = buildCoolEmbed({
            guildId: guild.id,
            type: "error",
            title: "💥 Server Wiped",
            description: "Everything has been deleted. Run `/server_setup` to start fresh.",
            fields: [{ name: "📋 Summary", value: lines.join("\n") }],
            showAuthor: true,
            client: interaction.client,
        });

        if (responseChannel) {
            await responseChannel.send({ embeds: [embed] }).catch(() => {});
        }

        return safeRespond(interaction, { embeds: [embed] }).catch(() => {});
    },
};
