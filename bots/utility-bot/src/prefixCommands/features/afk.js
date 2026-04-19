import { setAfk } from "../../utils/database.js";
import { replyEmbed } from "../../utils/embeds.js";

export default {
    name: "afk",
    async execute(message, args) {
        const reason = args.join(" ") || "AFK";
        await setAfk(message.author.id, reason);
        return replyEmbed(message, { type: "afk", title: "💤 AFK Enabled", description: `Reason: **${reason}**` });
    }
};
