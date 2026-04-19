import { ExtendedClient } from "./src/structures/Client.js";
import "dotenv/config";
import { initDB } from "./src/utils/db.js";

import interactionCreate from "./src/events/interactionCreate.js";
import messageCreate from "./src/events/messageCreate.js";
import ready from "./src/events/ready.js";
import loadCommands from "./src/handlers/commandHandler.js";

const client = new ExtendedClient();

async function init() {
    console.log("-----------------------------------------");
    console.log("[ai-bot] BEGINNING INITIALIZATION");
    console.log("-----------------------------------------");

    await initDB();
    await loadCommands(client);

    client.on(interactionCreate.name, (...args) => interactionCreate.execute(...args, client));
    client.on(messageCreate.name, (...args) => messageCreate.execute(...args, client));
    client.once(ready.name, (...args) => ready.execute(...args, client));

    console.log("[ai-bot] Logging in...");
    client.login(process.env.TOKEN);
}

init();

process.on("unhandledRejection", (err) => console.error("Unhandled Rejection:", err));
process.on("uncaughtException",  (err) => console.error("Uncaught Exception:",  err));
