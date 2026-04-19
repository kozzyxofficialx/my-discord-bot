import { Events } from "discord.js";
import { loadSettings } from "../utils/database.js";

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`✅ Logged in as ${client.user.tag}`);
        await loadSettings();
        await client.deploySlashCommands();
        console.log("✅ AI bot fully online.");
    }
};
