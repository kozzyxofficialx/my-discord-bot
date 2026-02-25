import { ExtendedClient } from "./src/structures/Client.js";
console.log("Client loaded");
const c = new ExtendedClient();
console.log("Client instantiated");
try {
    await c.loadHandlers();
    console.log("Handlers loaded");
} catch (e) {
    console.error("Handlers failed (Stack):", e.stack);
    console.error("Handlers failed (Msg):", e.message);
    if (e.code === 'ERR_MODULE_NOT_FOUND') {
        console.error("MISSING MODULE:", e.url); // Use .url if available
    }
}
