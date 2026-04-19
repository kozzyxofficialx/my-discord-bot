import { Events } from "discord.js";

export default {
    name: Events.GuildCreate,
    async execute(guild, client) {
        try {
            if (!client.user) return;
            await client.deploySlashCommands(guild.id);
            console.log(`✅ Instant deployed slash commands to ${guild.name} (${guild.id})`);
        } catch (err) {
            console.error("GuildCreate deploy error:", err);
        }
    }
};
