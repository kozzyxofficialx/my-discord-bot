import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload, buildCoolEmbed } from "../../utils/embeds.js";
import { getDB } from "../../utils/db.js";

export default {
    data: {
        name: "appeal",
        description: "Submit a ban appeal to a server.",
        dm_permission: true,
        integration_types: [0, 1],
        contexts: [0, 1, 2],
        options: [
            { name: "guild_id", description: "The server ID you were banned from.", type: 3, required: true },
            { name: "reason",   description: "Why should the ban be lifted?",        type: 3, required: true },
        ],
    },

    async execute(interaction) {
        const guildId = interaction.options.getString("guild_id").trim();
        const reason  = interaction.options.getString("reason").slice(0, 1000);

        const guild = interaction.client.guilds.cache.get(guildId);
        if (!guild) {
            return safeRespond(interaction, asEmbedPayload({
                guildId: null, type: "error",
                title: "❌ Server Not Found",
                description: "I couldn't find that server. Make sure you have the correct server ID and that the bot is in that server.",
                ephemeral: true,
            }));
        }

        // Verify user is actually banned
        const ban = await guild.bans.fetch(interaction.user.id).catch(() => null);
        if (!ban) {
            return safeRespond(interaction, asEmbedPayload({
                guildId: null, type: "error",
                title: "❌ Not Banned",
                description: `You don't appear to be banned from **${guild.name}**.`,
                ephemeral: true,
            }));
        }

        // Check for duplicate pending appeal
        const db = await getDB();
        const existing = await db.get(
            "SELECT id FROM appeals WHERE guild_id = ? AND user_id = ? AND status = 'pending'",
            guildId, interaction.user.id
        );
        if (existing) {
            return safeRespond(interaction, asEmbedPayload({
                guildId: null, type: "warning",
                title: "⏳ Appeal Already Pending",
                description: `You already have a pending appeal for **${guild.name}**. Please wait for staff to review it.`,
                ephemeral: true,
            }));
        }

        // Insert appeal record
        const result = await db.run(
            "INSERT INTO appeals (guild_id, user_id, reason, status, created_at) VALUES (?, ?, ?, 'pending', ?)",
            guildId, interaction.user.id, reason, Date.now()
        );
        const appealId = result.lastID;

        // Find the appeals channel in the target server
        const { getGuildSettings } = await import("../../utils/database.js");
        const settings = getGuildSettings(guildId);
        const channelId = settings.appealsChannelId;
        const staffChannel = channelId ? guild.channels.cache.get(channelId) : null;

        if (staffChannel?.isTextBased()) {
            const appealEmbed = new EmbedBuilder()
                .setColor(0xFAA61A)
                .setTitle("📩 New Ban Appeal")
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: "User", value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
                    { name: "Appeal ID", value: String(appealId), inline: true },
                    { name: "Ban Reason", value: ban.reason || "_No reason provided_" },
                    { name: "Appeal Reason", value: reason },
                )
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`appeal_accept_${appealId}_${interaction.user.id}`).setLabel("✅ Accept").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`appeal_deny_${appealId}_${interaction.user.id}`).setLabel("❌ Deny").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`appeal_pending_${appealId}_${interaction.user.id}`).setLabel("⏳ Mark Pending").setStyle(ButtonStyle.Secondary),
            );

            await staffChannel.send({ embeds: [appealEmbed], components: [row] }).catch(() => null);
        }

        return safeRespond(interaction, asEmbedPayload({
            guildId: null, type: "success",
            title: "📩 Appeal Submitted",
            description: `Your appeal for **${guild.name}** has been submitted (ID: \`${appealId}\`). Staff will review it.`,
            ephemeral: true,
        }));
    },
};
