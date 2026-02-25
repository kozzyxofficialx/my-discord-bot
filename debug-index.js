import { Client, GatewayIntentBits, Events } from "discord.js";
import "dotenv/config";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.on(Events.ClientReady, c => {
    console.log(`[DEBUG] Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
    console.log(`[DEBUG] RAW INTERACTION RECEIVED: ${interaction.id}`);
    if (interaction.isChatInputCommand()) {
        console.log(`[DEBUG] Command: ${interaction.commandName}`);
        try {
            await interaction.reply({ content: "Debug reply: Interaction received!", ephemeral: true });
            console.log("[DEBUG] Replied successfully.");
        } catch (e) {
            console.error("[DEBUG] Reply failed:", e);
        }
    }
});

client.on("raw", packet => {
    // Log interaction packets to be 100% sure
    if (packet.t === "INTERACTION_CREATE") {
        console.log("[DEBUG] RAW PACKET: INTERACTION_CREATE");
    }
});

client.login(process.env.TOKEN);
