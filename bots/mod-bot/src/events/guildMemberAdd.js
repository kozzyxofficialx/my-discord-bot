import { Events } from "discord.js";
import { checkRaid } from "../utils/raidProtection.js";

export default {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            await checkRaid(member);
        } catch (err) {
            console.error("[mod-bot] GuildMemberAdd error:", err);
        }
    }
};
