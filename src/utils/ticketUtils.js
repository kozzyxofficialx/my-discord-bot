import { ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { getGuildSettings, ticketRate, ticketAutoCloseTimers } from "./database.js";
import { safeRespond, safeUpdate } from "./helpers.js";
import { asEmbedPayload, sendEmbed, caseEmbed, postCase, buildCoolEmbed } from "./embeds.js";
import { summarizeTicket } from "./ai.js";

function canOpenTicket(guildId, userId) {
    const key = `${guildId}-${userId}`;
    const now = Date.now();
    const list = ticketRate.get(key) || [];
    const lastHour = list.filter((t) => now - t < 60 * 60 * 1000);
    if (lastHour.length >= 3) return { ok: false };
    lastHour.push(now);
    ticketRate.set(key, lastHour);
    return { ok: true, remaining: 3 - lastHour.length };
}

export async function scheduleTicketAutoClose(guild, channel, ms) {
    try {
        if (!ms || ms <= 0) return;

        const existing = ticketAutoCloseTimers.get(channel.id);
        if (existing) clearTimeout(existing);

        const timer = setTimeout(async () => {
            try {
                const fresh = await guild.channels.fetch(channel.id).catch(() => null);
                if (!fresh || !fresh.isTextBased()) return;

                await postCase(
                    guild,
                    caseEmbed(guild.id, "🎫 Ticket Closed (Auto)", [
                        `**Channel:** <#${channel.id}>`,
                        `**Reason:** Auto-close timer reached`,
                    ])
                );

                await sendEmbed(fresh, guild.id, {
                    type: "ticket",
                    title: "⏳ Ticket Auto-Closed",
                    description: "This ticket has been **auto-closed**.",
                });

                await fresh.delete("Ticket auto-closed");
            } catch (err) {
                console.error("Auto-close error:", err);
            } finally {
                ticketAutoCloseTimers.delete(channel.id);
            }
        }, ms);

        ticketAutoCloseTimers.set(channel.id, timer);
    } catch (err) {
        console.error("Schedule auto-close error:", err);
    }
}

export async function createTicketChannel(interaction, categoryId) {
    const guild = interaction.guild;
    if (!guild) return safeRespond(interaction, asEmbedPayload({
        guildId: null, type: "error", title: "❌ Error", description: "This can only be used in a server.", ephemeral: true
    }));

    const settings = getGuildSettings(guild.id);

    const rate = canOpenTicket(guild.id, interaction.user.id);
    if (!rate.ok) {
        return safeRespond(interaction, asEmbedPayload({
            guildId: guild.id,
            type: "error",
            title: "⛔ Ticket Limit",
            description: "You can only open **3 tickets per hour**. Try again later.",
            ephemeral: true,
        }));
    }

    const cat = (settings.ticket?.categories || []).find((c) => c.id === categoryId);
    const label = cat?.label || categoryId;

    const baseName = `ticket-${categoryId}`;
    const channelName = `${baseName}-${interaction.user.username}`
        .replace(/[^a-z0-9\-]/gi, "-")
        .toLowerCase()
        .slice(0, 90);

    const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        permissionOverwrites: [
            { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            {
                id: interaction.user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory,
                ],
            },
        ],
    });

    const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ticket_close").setLabel("🔒 Close Ticket").setStyle(ButtonStyle.Danger)
    );

    let roleDisplay = "";
    if (settings.ticket?.displayRoleId) {
        roleDisplay = `\n\n**For staff:** <@&${settings.ticket.displayRoleId}>`;
    }

    await channel.send({
        ...asEmbedPayload({
            guildId: guild.id,
            type: "ticket",
            title: "🎫 Ticket Opened",
            description:
                `**Opened by:** <@${interaction.user.id}>\n` +
                `**Category:** ${label}\n\n` +
                "A staff member will be with you shortly." +
                roleDisplay,
            footerUser: null,
        }),
        components: [closeRow],
        allowedMentions: { parse: [] }, // show role mention but do not ping
    });

    await safeRespond(interaction, asEmbedPayload({
        guildId: guild.id,
        type: "success",
        title: "✅ Ticket Created",
        description: `Your ticket has been created: <#${channel.id}>`,
        ephemeral: true,
    }));

    await postCase(
        guild,
        caseEmbed(guild.id, "🎫 Ticket Opened", [
            `**User:** ${interaction.user.tag} (<@${interaction.user.id}>)`,
            `**Category:** ${label}`,
            `**Channel:** <#${channel.id}>`,
        ])
    );

    const ms = settings.ticket?.autoCloseMs || 0;
    await scheduleTicketAutoClose(guild, channel, ms);
}

export async function closeTicketByStaff(interaction) {
    const guild = interaction.guild;
    if (!guild) return safeRespond(interaction, asEmbedPayload({
        guildId: null, type: "error", title: "❌ Error", description: "This can only be used in a server.", ephemeral: true
    }));

    const member = await guild.members.fetch(interaction.user.id);
    if (
        !member.permissions.has(PermissionsBitField.Flags.ManageChannels) &&
        !member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
        return safeRespond(interaction, asEmbedPayload({
            guildId: guild.id,
            type: "error",
            title: "⛔ Staff Only",
            description: "Only staff can close tickets.",
            ephemeral: true,
        }));
    }

    const channel = interaction.channel;
    if (!channel) return safeRespond(interaction, asEmbedPayload({
        guildId: guild.id, type: "error", title: "❌ Error", description: "Channel not found.", ephemeral: true
    }));

    await safeRespond(interaction, asEmbedPayload({
        guildId: guild.id,
        type: "success",
        title: "✅ Closing Ticket",
        description: "This ticket will now be closed.",
        ephemeral: true,
    }));

    const timer = ticketAutoCloseTimers.get(channel.id);
    if (timer) clearTimeout(timer);
    ticketAutoCloseTimers.delete(channel.id);

    // AI ticket summary (if plugin enabled)
    const settings = getGuildSettings(guild.id);
    if (settings.plugins?.ai_moderation || true) { // run if any ai feature is on — cheap operation
        try {
            const fetched = await channel.messages.fetch({ limit: 100 });
            const msgs = [...fetched.values()]
                .reverse()
                .filter(m => !m.author.bot || m.embeds.length === 0)
                .map(m => ({ author: m.author.username, content: m.content || "[embed]" }));

            if (msgs.length > 2) {
                const summary = await summarizeTicket(msgs);
                if (summary && summary !== "ERROR" && summary !== "QUOTA_EXCEEDED") {
                    await postCase(guild, buildCoolEmbed({
                        guildId: guild.id,
                        type: "ticket",
                        title: "📋 Ticket Summary",
                        description: `**Channel:** <#${channel.id}> (closed by ${interaction.user.tag})\n\n${summary}`,
                    }));
                }
            }
        } catch (err) {
            console.error("[ticketUtils] Summary failed:", err);
        }
    }

    await postCase(
        guild,
        caseEmbed(guild.id, "🎫 Ticket Closed (Manual)", [
            `**Channel:** <#${channel.id}>`,
            `**Closed by:** ${interaction.user.tag}`,
        ])
    );

    try {
        await sendEmbed(channel, guild.id, {
            type: "ticket",
            title: "🔒 Ticket Closed",
            description: `Closed by **${interaction.user.tag}**.`,
        });
    } catch { }

    return channel.delete("Ticket closed by staff").catch(() => { });
}

export function buildTicketPanelEmbed(guildId) {
    const settings = getGuildSettings(guildId);
    return {
        title: settings.ticket?.panelTitle || "🎫 Support Tickets",
        description: settings.ticket?.panelDescription || "Click the button below to open a ticket.",
        color: settings.embedColors?.ticket || 0x57F287,
    };
}

export function buildTicketPanelComponents(guildId) {
    const settings = getGuildSettings(guildId);
    const categories = settings.ticket?.categories || [
        { id: "support", label: "General Support" },
        { id: "report", label: "Report User" }
    ];

    const row = new ActionRowBuilder();
    categories.slice(0, 5).forEach(cat => {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`ticket_open_${cat.id}`)
                .setLabel(cat.label)
                .setStyle(ButtonStyle.Primary)
        );
    });

    return [row];
}
