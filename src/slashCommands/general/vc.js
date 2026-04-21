import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";
import { getDB } from "../../utils/db.js";

export default {
    data: {
        name: "vc",
        description: "Manage your dynamic voice channel.",
        dm_permission: false,
        options: [
            {
                name: "setup",
                description: "Set the trigger channel for dynamic VCs. (Manage Server only)",
                type: 1,
                options: [
                    { name: "trigger", description: "Voice channel users join to get their own VC.", type: 7, required: true },
                    { name: "category", description: "Category to create VCs in (defaults to trigger's category).", type: 7, required: false },
                    { name: "user_limit", description: "Default user limit (0 = unlimited).", type: 4, required: false, min_value: 0, max_value: 99 },
                ],
            },
            { name: "lock",   description: "Lock your VC — only you can invite others.",  type: 1 },
            { name: "unlock", description: "Unlock your VC.",                              type: 1 },
            {
                name: "rename",
                description: "Rename your VC.",
                type: 1,
                options: [{ name: "name", description: "New channel name.", type: 3, required: true }],
            },
            {
                name: "limit",
                description: "Set a user limit on your VC (0 = unlimited).",
                type: 1,
                options: [{ name: "number", description: "Max users (0–99).", type: 4, required: true, min_value: 0, max_value: 99 }],
            },
        ],
    },

    async execute(interaction) {
        if (!interaction.guildId) return;
        const sub = interaction.options.getSubcommand();
        const guild = interaction.guild;

        // ── setup (Manage Server) ────────────────────────────────────────────
        if (sub === "setup") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                return safeRespond(interaction, asEmbedPayload({ guildId: guild.id, type: "error", title: "⛔ Permission Denied", description: "You need **Manage Server**.", ephemeral: true }));
            }
            const trigger  = interaction.options.getChannel("trigger");
            const category = interaction.options.getChannel("category");
            const limit    = interaction.options.getInteger("user_limit") ?? 0;
            const settings = getGuildSettings(guild.id);
            settings.dynamicVc = { triggerChannelId: trigger.id, categoryId: category?.id ?? trigger.parentId ?? null, userLimit: limit };
            await saveSettings();
            return safeRespond(interaction, asEmbedPayload({
                guildId: guild.id, type: "success",
                title: "✅ Dynamic VCs Configured",
                description: `Trigger: <#${trigger.id}>\nUsers join that channel to get their own VC.\n\nEnable the plugin with \`/plugins enable dynamic_vc\`.`,
                ephemeral: true,
            }));
        }

        // ── owner-only commands ──────────────────────────────────────────────
        const voiceChannel = interaction.member.voice?.channel;
        if (!voiceChannel) {
            return safeRespond(interaction, asEmbedPayload({ guildId: guild.id, type: "error", title: "❌ Not in a VC", description: "You must be in your dynamic VC to use this.", ephemeral: true }));
        }

        const db = await getDB();
        const row = await db.get("SELECT owner_id FROM dynamic_vcs WHERE channel_id = ?", voiceChannel.id);
        if (!row || row.owner_id !== interaction.user.id) {
            return safeRespond(interaction, asEmbedPayload({ guildId: guild.id, type: "error", title: "❌ Not Your VC", description: "You can only control your own dynamic VC.", ephemeral: true }));
        }

        if (sub === "lock") {
            await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, { Connect: false }).catch(() => null);
            await voiceChannel.permissionOverwrites.edit(interaction.user.id, { Connect: true }).catch(() => null);
            return safeRespond(interaction, asEmbedPayload({ guildId: guild.id, type: "success", title: "🔒 VC Locked", description: "Only you can let others in now.", ephemeral: true }));
        }

        if (sub === "unlock") {
            await voiceChannel.permissionOverwrites.delete(guild.roles.everyone).catch(() => null);
            return safeRespond(interaction, asEmbedPayload({ guildId: guild.id, type: "success", title: "🔓 VC Unlocked", description: "Anyone can join your VC.", ephemeral: true }));
        }

        if (sub === "rename") {
            const name = interaction.options.getString("name").slice(0, 100);
            await voiceChannel.setName(name).catch(() => null);
            return safeRespond(interaction, asEmbedPayload({ guildId: guild.id, type: "success", title: "✏️ VC Renamed", description: `Your VC is now **${name}**.`, ephemeral: true }));
        }

        if (sub === "limit") {
            const num = interaction.options.getInteger("number");
            await voiceChannel.setUserLimit(num).catch(() => null);
            return safeRespond(interaction, asEmbedPayload({ guildId: guild.id, type: "success", title: "👥 Limit Set", description: num === 0 ? "Your VC is now unlimited." : `Your VC is now limited to **${num}** users.`, ephemeral: true }));
        }
    },
};
