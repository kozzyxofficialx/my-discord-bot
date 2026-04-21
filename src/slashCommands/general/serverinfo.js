import { safeRespond } from "../../utils/helpers.js";
import { buildCoolEmbed, asEmbedPayload } from "../../utils/embeds.js";

export default {
    data: { name: "serverinfo", description: "Show info about this server" },
    async execute(i) {
        const g = i.guild;
        if (!g) {
            return safeRespond(i, asEmbedPayload({ guildId: null, type: "error", title: "❌ Server Only", description: "Use this in a server.", ephemeral: true }));
        }

        const owner = await g.fetchOwner().catch(() => null);
        const created = `<t:${Math.floor(g.createdTimestamp / 1000)}:F>`;

        const fields = [
            { name: "Name", value: g.name, inline: true },
            { name: "Server ID", value: g.id, inline: true },
            { name: "Owner", value: owner ? `${owner.user.tag}` : "Unknown", inline: true },
            { name: "Created", value: created, inline: false },
            { name: "Members", value: `${g.memberCount}`, inline: true },
            { name: "Channels", value: `${g.channels.cache.size}`, inline: true },
            { name: "Roles", value: `${g.roles.cache.size}`, inline: true },
        ];

        const embed = buildCoolEmbed({
            guildId: g.id,
            type: "info",
            title: "🏠 Server Info",
            description: `**${g.name}**`,
            fields,
            showAuthor: true,
            showFooter: false,
            client: i.client,
        });

        if (g.iconURL()) embed.setThumbnail(g.iconURL({ dynamic: true, size: 256 }));

        return safeRespond(i, { embeds: [embed] });
    }
};
