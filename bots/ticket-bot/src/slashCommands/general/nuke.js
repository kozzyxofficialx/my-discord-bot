import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";

export default {
    data: {
        name: "nuke",
        description: "Delete messages from this channel.",
        default_member_permissions: String(PermissionsBitField.Flags.ManageMessages),
        dm_permission: false,
        options: [
            {
                name: "amount",
                description: "Number of messages to delete (1–1000). Omit to delete ALL messages.",
                type: 4, // INTEGER
                required: false,
                min_value: 1,
                max_value: 1000,
            },
        ],
    },

    async execute(interaction) {
        const channel = interaction.channel;
        const amount = interaction.options.getInteger("amount"); // null = all

        const me = interaction.guild.members.me;
        if (!me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return safeRespond(interaction, asEmbedPayload({
                guildId: interaction.guildId, type: "error",
                title: "❌ Missing Permission",
                description: "I need **Manage Messages** to do this.",
                ephemeral: true,
            }));
        }

        await interaction.deferReply({ ephemeral: true });

        let deleted = 0;
        const target = amount ?? Infinity;

        // Discord bulkDelete only handles ≤100 messages and only messages <14 days old.
        // Loop in batches of 100 until we hit the target or run out of messages.
        while (deleted < target) {
            const batchSize = Math.min(100, target - deleted);
            const fetched = await channel.messages.fetch({ limit: batchSize });
            if (fetched.size === 0) break;

            const bulk = await channel.bulkDelete(fetched, true).catch(() => null);
            const count = bulk?.size ?? 0;
            deleted += count;

            // If Discord returned fewer than we asked for, we've hit the 14-day wall
            if (count < fetched.size || count === 0) break;

            // Small pause to avoid rate limits between batches
            if (deleted < target) await new Promise(r => setTimeout(r, 1000));
        }

        return safeRespond(interaction, asEmbedPayload({
            guildId: interaction.guildId,
            type: "success",
            title: "💥 Nuked",
            description: `Deleted **${deleted}** message${deleted !== 1 ? "s" : ""} from <#${channel.id}>.\n\n_Note: messages older than 14 days cannot be bulk deleted by Discord._`,
        }));
    },
};
