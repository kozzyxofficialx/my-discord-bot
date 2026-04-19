import { Events } from "discord.js";
import { loadSettings, loadWarnings } from "../utils/database.js";

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`✅ Logged in as ${client.user.tag}`);
        await loadSettings();
        await loadWarnings();
        await client.deploySlashCommands();
        console.log("✅ Mod bot fully online.");
    }
};
