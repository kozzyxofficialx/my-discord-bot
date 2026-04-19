import { safeRespond } from "../../utils/helpers.js";
import { buildCoolEmbed } from "../../utils/embeds.js";

function formatUptime(ms) {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    parts.push(`${m}m`);
    return parts.join(" ");
}

export default {
    data: {
        name: "stats",
        description: "Show bot stats.",
    },

    async execute(interaction) {
        const { client } = interaction;
        const memMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

        const embed = buildCoolEmbed({
            guildId: interaction.guildId,
            type: "info",
            client,
            title: `📊 ${client.user.username} Stats`,
            fields: [
                { name: "🏠 Servers",  value: `${client.guilds.cache.size}`,          inline: true },
                { name: "🏓 Ping",     value: `${client.ws.ping}ms`,                  inline: true },
                { name: "⏱️ Uptime",   value: formatUptime(client.uptime),            inline: true },
                { name: "💾 Memory",   value: `${memMB} MB`,                          inline: true },
                { name: "⚙️ Node.js",  value: process.version,                        inline: true },
                { name: "📚 discord.js", value: `v${(await import("discord.js")).version}`, inline: true },
            ],
            showAuthor: true,
            showFooter: true,
            footerText: "kozzyx mod-bot",
        });

        return safeRespond(interaction, { embeds: [embed] });
    },
};
