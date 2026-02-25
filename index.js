import { ExtendedClient } from "./src/structures/Client.js";
import "dotenv/config";
import { initDB } from "./src/utils/db.js";
import { initReminders } from "./src/utils/reminders.js";

// Explicit imports to bypass loader issues
import interactionCreate from "./src/events/interactionCreate.js";
import messageCreate from "./src/events/messageCreate.js";
import messageReactionAdd from "./src/events/messageReactionAdd.js";
import messageReactionRemove from "./src/events/messageReactionRemove.js";
import loadCommands from "./src/handlers/commandHandler.js";
import { Events } from "discord.js";

const client = new ExtendedClient();

async function init() {
    console.log("-----------------------------------------");
    console.log("[Startup] BEGINNING INITIALIZATION");
    console.log("-----------------------------------------");

    await initDB();

    // 1. Load Commands explicitly
    console.log("[Startup] Loading Commands...");
    await loadCommands(client);

    // 2. Register Interaction Handler explicitly
    console.log("[Startup] Registering Interaction Handler...");
    client.on(Events.InteractionCreate, async (...args) => {
        try {
            await interactionCreate.execute(...args, client);
        } catch (err) {
            console.error("[CRITICAL] Uncaught error in interaction handler:", err);
        }
    });

    client.on(Events.MessageCreate, async (...args) => {
        try {
            await messageCreate.execute(...args, client);
        } catch (err) {
            console.error("[CRITICAL] Uncaught error in message handler:", err);
        }
    });

    client.on(Events.MessageReactionAdd, async (...args) => {
        try {
            await messageReactionAdd.execute(...args, client);
        } catch (err) { }
    });

    client.on(Events.MessageReactionRemove, async (...args) => {
        try {
            await messageReactionRemove.execute(...args, client);
        } catch (err) { }
    });

    // 3. Register Ready Handler explicitly
    client.once(Events.ClientReady, (c) => {
        console.log(`[Startup] ✅ Logged in as ${c.user.tag}`);
        // Deploy code moved here to be safe
        client.deploySlashCommands();
    });

    // 4. Init Utilities
    await initReminders(client);

    console.log("[Startup] Logging in...");
    client.login(process.env.TOKEN);
}

init();

process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection:", err);
});
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});
