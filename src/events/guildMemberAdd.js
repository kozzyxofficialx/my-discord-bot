import { Events } from "discord.js";
import { getGuildSettings, getUserCosmetics, setUserCosmetics } from "../utils/database.js";

export default {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            const isBooster = member.premiumSince || member.roles.cache.some((r) => r.tags?.premiumSubscriber);
            if (!isBooster) return;

            const settings = getGuildSettings(member.guild.id);
            const cfg = settings.boosterWelcomeBonus || { enabled: true, title: "Server Booster" };
            if (!cfg.enabled) return;

            const title = String(cfg.title || "Server Booster");
            const cos = await getUserCosmetics(member.id);
            if (!cos.manualTitle) {
                await setUserCosmetics(member.id, { autoTitle: title });
            }

            try {
                await member.send(
                    `💜 Thanks for boosting **${member.guild.name}**!
You've received the title **${title}**!`
                );
            } catch { }
        } catch (err) {
            console.error("Booster welcome error:", err);
        }
    }
};
