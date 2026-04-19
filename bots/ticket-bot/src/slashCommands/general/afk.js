import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";

export default {
    data: {
        name: "afk", description: "Set your AFK status", options: [
            { name: "reason", description: "AFK reason", type: 3, required: false }
        ]
    },
    async execute(interaction) {
        return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guild?.id, type: "afk", title: "💤 AFK", description: "Use `,afk <reason>` in chat.", ephemeral: true }));
    }
};
