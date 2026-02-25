import { Events } from "discord.js";
import { loadSettings, loadWarnings, loadAutoresponders, loadBoosterRoles } from "../utils/database.js";

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`✅ Logged in as ${client.user.tag}`);

        await loadSettings();
        await loadWarnings();
        await loadAutoresponders();
        await loadBoosterRoles();

        // Optional: Deploy commands to all guilds on startup to ensure consistency
        await client.deploySlashCommands();

        console.log("✅ All data loaded. Bot is fully online.");
    }
};
