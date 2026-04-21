import { PermissionsBitField } from "discord.js";
import { doTimeout } from "../../utils/moderationUtils.js";
import { replyEmbed } from "../../utils/embeds.js";
import { parseDurationToMs } from "../../utils/helpers.js";

export default {
    name: "damage",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return replyEmbed(message, { type: "error", title: "⛔ Permission Needed", description: "You need **Timeout Members** permission." });
        }
        const target = message.mentions.members.first();
        if (!target) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "` ,damage @user <time>` (e.g. 10m, 1h)" });
        const timeArg = args.find((a) => !a.startsWith("<@"));
        const ms = parseDurationToMs(timeArg || "10m");
        if (ms === null || ms === 0) return replyEmbed(message, { type: "error", title: "❌ Invalid Time", description: "Time must be like `10m`, `1h`, `1d`." });
        return doTimeout(message, target, ms);
    }
};
