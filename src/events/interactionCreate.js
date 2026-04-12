import { Events, PermissionsBitField } from "discord.js";
import { safeRespond } from "../utils/helpers.js";
import { asEmbedPayload, buildCoolEmbed } from "../utils/embeds.js";
import { createTicketChannel, closeTicketByStaff } from "../utils/ticketUtils.js";
import { getDB } from "../utils/db.js";

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
