import { Events } from "discord.js";
import { getGuildSettings } from "../utils/database.js";

export default {
    name: Events.GuildMemberUpdate,
    async execute(oldM, newM) {
        try {
            const settings = getGuildSettings(newM.guild.id);
            if (settings.plugins?.nicklock === false) return;
            if (!settings.nickLocks || !settings.nickLocks[newM.id]) return;
            const lock = settings.nickLocks[newM.id];
            if (oldM.nickname !== newM.nickname) {
                try { await newM.setNickname(lock, "Nickname locked"); } catch { }
            }
        } catch { }
    }
};
