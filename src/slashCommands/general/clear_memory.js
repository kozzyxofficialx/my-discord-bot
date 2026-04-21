import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { getDB } from "../../utils/db.js";

export default {
    data: {
        name: "clear_memory",
        description: "Clear Claude's conversation history for you in this server.",
        integration_types: [0, 1],
        contexts: [0, 1, 2],
    },
    async execute(i) {
        const guildId = i.guild?.id ?? "dm";
        const db = await getDB();
        const result = await db.run(
            "DELETE FROM conversation_history WHERE user_id = ? AND guild_id = ?",
            i.user.id, guildId
        );

        const cleared = result.changes > 0;
        return safeRespond(i, asEmbedPayload({
            guildId: i.guild?.id,
            type: cleared ? "success" : "info",
            title: cleared ? "🧹 Memory Cleared" : "💭 Nothing to Clear",
            description: cleared
                ? "Claude's conversation history for you in this server has been wiped. Next `/ask` starts fresh."
                : "You have no stored conversation history here.",
            ephemeral: true,
        }));
    },
};
