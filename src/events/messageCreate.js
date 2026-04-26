import { Events } from "discord.js";
import { replyEmbed } from "../utils/embeds.js";
import { checkMassMention } from "../utils/raidProtection.js";

const MOD_PREFIX = ",";
const CONFIG_PREFIX = "!";

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        try {
            if (!message?.content || message.author.bot) return;
            if (!message.guild) return;

            // Anti-raid: mass-mention detection (runs on every guild message)
            const blocked = await checkMassMention(message);
            if (blocked) return;

            const raw = message.content;
            const isConfig = raw.startsWith(CONFIG_PREFIX);
            const isMod = raw.startsWith(MOD_PREFIX);
            if (!isConfig && !isMod) return;

            const prefix = isConfig ? CONFIG_PREFIX : MOD_PREFIX;
            const args = raw.slice(prefix.length).trim().split(/\s+/);
            const commandName = args.shift()?.toLowerCase();
            if (!commandName) return;

            const command = client.prefixCommands.get(commandName)
                || client.prefixCommands.get(client.aliases.get(commandName));

            if (!command) return;

            // Route by prefix: ! only runs config commands, , only runs non-config
            if (isConfig && !command.config) return;
            if (isMod && command.config) return;

            try {
                await command.execute(message, args, client);
            } catch (error) {
                console.error("[messageCreate] Command execution error:", error);
                await replyEmbed(message, {
                    type: "error",
                    title: "❌ Error",
                    description: "There was an error while executing this command!",
                });
            }
        } catch (err) {
            console.error("[messageCreate] Error:", err);
        }
    }
};
