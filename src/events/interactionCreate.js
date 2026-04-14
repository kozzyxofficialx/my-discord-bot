import { Events, PermissionsBitField } from "discord.js";
import { safeRespond } from "../utils/helpers.js";
import { asEmbedPayload, buildCoolEmbed } from "../utils/embeds.js";
import { createTicketChannel, closeTicketByStaff } from "../utils/ticketUtils.js";
import { getDB } from "../utils/db.js";
import { getGuildSettings } from "../utils/database.js";

export default {
    name: Events.InteractionCreate,
    async execute(interaction, client) {

        // ── SLASH COMMANDS ──────────────────────────────────────────────────
        if (interaction.isChatInputCommand()) {
            const cmdName = interaction.commandName;
            const command = client.slashCommands.get(cmdName);

            if (!command) {
                console.error(`[Interaction] ❌ Command '${cmdName}' not found.`);
                return safeRespond(interaction, { content: `❌ Command \`${cmdName}\` not found. Deployment mismatch?`, ephemeral: true });
            }

            // Check if command is disabled for this guild
            if (interaction.guildId) {
                const settings = getGuildSettings(interaction.guildId);
                if ((settings.disabledCommands?.slash ?? []).includes(cmdName)) {
                    return safeRespond(interaction, { content: "🚫 This command is disabled in this server.", ephemeral: true });
                }
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`[Interaction] ❌ Execution failed for '${cmdName}':`, error);
                await safeRespond(interaction, { content: `❌ Internal error while executing \`${cmdName}\`. Check logs.`, ephemeral: true });
            }
            return;
        }

        // ── BUTTONS ─────────────────────────────────────────────────────────
        if (interaction.isButton()) {
            const id = interaction.customId;

            // Ticket open (ticket_open_<categoryId>)
            if (id.startsWith("ticket_open_")) {
                if (interaction.guildId) {
                    const settings = getGuildSettings(interaction.guildId);
                    if (settings.plugins?.tickets === false) {
                        return safeRespond(interaction, { content: "🚫 The ticket system is disabled in this server.", ephemeral: true });
                    }
                }
                const categoryId = id.slice("ticket_open_".length);
                return createTicketChannel(interaction, categoryId);
            }

            // Ticket close
            if (id === "ticket_close") {
                return closeTicketByStaff(interaction);
            }

            // Appeal buttons: appeal_accept_<id>_<userId> | appeal_deny_<id>_<userId> | appeal_pending_<id>_<userId>
            if (id.startsWith("appeal_")) {
                return handleAppealButton(interaction);
            }

            // Help pagination: help_prev:<category>:<page> | help_next:<category>:<page>
            if (id.startsWith("help_prev:") || id.startsWith("help_next:")) {
                const parts = id.split(":");
                const dir = parts[0]; // help_prev or help_next
                const category = parts[1];
                const page = parseInt(parts[2]);
                const newPage = dir === "help_prev" ? page - 1 : page + 1;
                const { helpPages } = await import("../slashCommands/general/help.js");
                const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import("discord.js");
                const pages = helpPages[category];
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`help_prev:${category}:${newPage}`).setLabel("⬅ Previous").setStyle(ButtonStyle.Secondary).setDisabled(newPage === 0),
                    new ButtonBuilder().setCustomId(`help_next:${category}:${newPage}`).setLabel("Next ➡").setStyle(ButtonStyle.Primary).setDisabled(newPage === pages.length - 1)
                );
                return interaction.update({ embeds: [pages[newPage]], components: [row] });
            }

            // Modhelp pagination: modhelp_prev:<page> | modhelp_next:<page>
            if (id.startsWith("modhelp_prev:") || id.startsWith("modhelp_next:")) {
                const parts = id.split(":");
                const dir = parts[0];
                const page = parseInt(parts[1]);
                const newPage = dir === "modhelp_prev" ? page - 1 : page + 1;
                const { modHelpPages } = await import("../slashCommands/general/modhelp.js");
                const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import("discord.js");
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`modhelp_prev:${newPage}`).setLabel("⬅ Previous").setStyle(ButtonStyle.Secondary).setDisabled(newPage === 0),
                    new ButtonBuilder().setCustomId(`modhelp_next:${newPage}`).setLabel("Next ➡").setStyle(ButtonStyle.Primary).setDisabled(newPage === modHelpPages.length - 1)
                );
                return interaction.update({ embeds: [modHelpPages[newPage]], components: [row] });
            }

            // Features pagination: features_prev:<page> | features_next:<page>
            if (id.startsWith("features_prev:") || id.startsWith("features_next:")) {
                const parts = id.split(":");
                const dir = parts[0];
                const page = parseInt(parts[1]);
                const newPage = dir === "features_prev" ? page - 1 : page + 1;
                const { featureHelpPages } = await import("../slashCommands/general/features.js");
                const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import("discord.js");
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`features_prev:${newPage}`).setLabel("⬅ Previous").setStyle(ButtonStyle.Secondary).setDisabled(newPage === 0),
                    new ButtonBuilder().setCustomId(`features_next:${newPage}`).setLabel("Next ➡").setStyle(ButtonStyle.Primary).setDisabled(newPage === featureHelpPages.length - 1)
                );
                return interaction.update({ embeds: [featureHelpPages[newPage]], components: [row] });
            }
        }
    }
};

async function handleAppealButton(interaction) {
    if (!interaction.guild) return;
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "⛔ Permission Denied", description: "You need **Ban Members** to handle appeals.", ephemeral: true }));
    }

    const parts = interaction.customId.split("_"); // ["appeal", action, id, userId]
    const action   = parts[1]; // accept | deny | pending
    const appealId = parts[2];
    const userId   = parts[3];

    const db = await getDB();
    const appeal = await db.get("SELECT * FROM appeals WHERE id = ?", appealId);
    if (!appeal || appeal.status !== "pending") {
        return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "warning", title: "⚠️ Already Resolved", description: "This appeal has already been handled.", ephemeral: true }));
    }

    if (action === "pending") {
        await db.run("UPDATE appeals SET status = 'reviewing', staff_id = ? WHERE id = ?", interaction.user.id, appealId);
        await interaction.update({ components: [] }).catch(() => null);
        return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "info", title: "⏳ Marked as Reviewing", description: `Appeal #${appealId} is marked as under review by ${interaction.user.tag}.`, ephemeral: true }));
    }

    if (action === "accept") {
        await interaction.guild.bans.remove(userId, `Appeal #${appealId} accepted by ${interaction.user.tag}`).catch(() => null);
        await db.run("UPDATE appeals SET status = 'accepted', staff_id = ?, resolved_at = ? WHERE id = ?", interaction.user.id, Date.now(), appealId);

        // DM the user
        try {
            const user = await interaction.client.users.fetch(userId);
            await user.send({ embeds: [buildCoolEmbed({ guildId: null, type: "success", title: "✅ Appeal Accepted", description: `Your ban appeal for **${interaction.guild.name}** has been accepted. You are now unbanned.` })] }).catch(() => null);
        } catch { }

        await interaction.update({ components: [] }).catch(() => null);
        return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "success", title: "✅ Appeal Accepted", description: `<@${userId}> has been unbanned.`, ephemeral: true }));
    }

    if (action === "deny") {
        await db.run("UPDATE appeals SET status = 'denied', staff_id = ?, resolved_at = ? WHERE id = ?", interaction.user.id, Date.now(), appealId);

        try {
            const user = await interaction.client.users.fetch(userId);
            await user.send({ embeds: [buildCoolEmbed({ guildId: null, type: "error", title: "❌ Appeal Denied", description: `Your ban appeal for **${interaction.guild.name}** has been denied.` })] }).catch(() => null);
        } catch { }

        await interaction.update({ components: [] }).catch(() => null);
        return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "info", title: "❌ Appeal Denied", description: `Appeal #${appealId} has been denied.`, ephemeral: true }));
    }
}
