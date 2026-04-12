import { Client, Collection, GatewayIntentBits, Partials, REST, Routes } from "discord.js";
import { readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ExtendedClient extends Client {
    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
            ],
            partials: [Partials.Channel],
        });

        this.slashCommands = new Collection();
        this.slashData = []; // for registration
    }

    async loadHandlers() {
        await import("../handlers/eventHandler.js").then((h) => h.default(this));
        await import("../handlers/commandHandler.js").then((h) => h.default(this));
    }

    async deploySlashCommands(guildId = null) {
        const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
        try {
            if (guildId) {
                await rest.put(Routes.applicationGuildCommands(this.user.id, guildId), { body: this.slashData });
            } else {
                await rest.put(Routes.applicationCommands(this.user.id), { body: this.slashData });
                console.log(`✅ Deployed ${this.slashData.length} global commands.`);
            }
        } catch (e) {
            console.error("Deploy error:", e);
        }
    }
}
