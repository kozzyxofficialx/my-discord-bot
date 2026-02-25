import { afkMap } from "../../utils/database.js";
import { replyEmbed } from "../../utils/embeds.js";

export default {
    name: "afk",
    async execute(message, args) {
        const reason = args.join(" ") || "AFK";
        afkMap.set(message.author.id, { reason, since: Date.now() });
        return replyEmbed(message, { type: "afk", title: "💤 AFK Enabled", description: `Reason: **${reason}**` });
    }
};
