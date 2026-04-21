import { ExtendedClient } from "./src/structures/Client.js";
import "dotenv/config";
import { initDB } from "./src/utils/db.js";

import interactionCreate from "./src/events/interactionCreate.js";
import messageCreate from "./src/events/messageCreate.js";
import ready from "./src/events/ready.js";
import guildMemberAdd from "./src/events/guildMemberAdd.js";
import guildMemberUpdate from "./src/events/guildMemberUpdate.js";
import guildAuditLogEntryCreate from "./src/events/guildAuditLogEntryCreate.js";
import guildCreate from "./src/events/guildCreate.js";
import voiceStateUpdate from "./src/events/voiceStateUpdate.js";
import loadCommands from "./src/handlers/commandHandler.js";

const client = new ExtendedClient();

async function init() {
    console.log("-----------------------------------------");
    console.log("[bot] BEGINNING INITIALIZATION");
    console.log("-----------------------------------------");

    await initDB();
    await loadCommands(client);

    client.on(interactionCreate.name,        (...args) => interactionCreate.execute(...args, client));
    client.on(messageCreate.name,            (...args) => messageCreate.execute(...args, client));
    client.on(guildMemberAdd.name,           (...args) => guildMemberAdd.execute(...args, client));
    client.on(guildMemberUpdate.name,        (...args) => guildMemberUpdate.execute(...args, client));
    client.on(guildAuditLogEntryCreate.name, (...args) => guildAuditLogEntryCreate.execute(...args, client));
    client.on(guildCreate.name,              (...args) => guildCreate.execute(...args, client));
    client.on(voiceStateUpdate.name,         (...args) => voiceStateUpdate.execute(...args, client));
    client.once(ready.name,                  (...args) => ready.execute(...args, client));

    console.log("[bot] Logging in...");
    client.login(process.env.TOKEN);
}

init();

process.on("unhandledRejection", (err) => console.error("Unhandled Rejection:", err));
process.on("uncaughtException",  (err) => console.error("Uncaught Exception:",  err));
