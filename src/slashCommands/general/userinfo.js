import { safeRespond } from "../../utils/helpers.js";
import { buildCoolEmbed, asEmbedPayload } from "../../utils/embeds.js";

export default {
    data: {
        name: "userinfo", description: "Show info about a user", options: [
            { name: "user", description: "Pick a user", type: 6, required: false }
        ]
    },
    async execute(i) {
        const user = i.options?.getUser?.("user") || i.user;
        const member = i.guild ? await i.guild.members.fetch(user.id).catch(() => null) : null;

        const created = `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`;
        const joined = member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : "N/A";

        const roles = member
            ? member.roles.cache
                .filter((r) => r.id !== i.guild.id)
                .map((r) => r.toString())
                .slice(0, 20)
            : [];

        const fields = [
            { name: "User", value: `${user.tag}`, inline: true },
            { name: "User ID", value: `${user.id}`, inline: true },
            { name: "Created", value: created, inline: false },
        ];

        if (i.guild) fields.push({ name: "Joined", value: joined, inline: false });
        if (roles.length) fields.push({ name: "Roles", value: roles.join(" "), inline: false });

        const embed = buildCoolEmbed({
            guildId: i.guild?.id,
            type: "info",
            title: "👤 User Info",
            description: `${user} (${user.tag})`,
            fields,
            showAuthor: true,
            showFooter: false,
            client: i.client,
        });

        if (user.displayAvatarURL) embed.setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }));

        return safeRespond(i, { embeds: [embed] });
    }
};
