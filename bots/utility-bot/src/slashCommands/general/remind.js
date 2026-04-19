import { safeRespond, parseDurationToMs } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { addReminder, scheduleReminder } from "../../utils/reminders.js";

export default {
    data: {
        name: "remind",
        description: "Set a reminder",
        integration_types: [0, 1],
        contexts: [0, 1, 2],
        options: [
            { name: "time", description: "When? (e.g. 10m, 1h, 1d)", type: 3, required: true },
            { name: "what", description: "Reminder content", type: 3, required: true }
        ]
    },
    async execute(i) {
        const timeStr = i.options.getString("time");
        const content = i.options.getString("what");

        const ms = parseDurationToMs(timeStr);
        if (!ms || ms <= 0) {
            return safeRespond(i, { content: "Invalid time format. Use `10m`, `1h`, `1d`.", ephemeral: true });
        }

        const remindAt = Date.now() + ms;
        const channelId = i.channelId; // Works for Guild & DMs

        const id = await addReminder(i.user.id, content, remindAt, channelId);

        // Schedule in-memory
        scheduleReminder(i.client, { id, user_id: i.user.id, content, remind_at: remindAt, channel_id: channelId });

        return safeRespond(i, asEmbedPayload({
            guildId: i.guild?.id,
            type: "success",
            title: "⏰ Reminder Set",
            description: `I will remind you about **"${content}"** in **${timeStr}** (<t:${Math.floor(remindAt / 1000)}:R>).`,
            ephemeral: true,
        }));
    }
};
