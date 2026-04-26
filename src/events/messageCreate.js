import { Events } from "discord.js";
import { replyEmbed } from "../utils/embeds.js";
import { checkMassMention } from "../utils/raidProtection.js";

const PREFIX = ",";

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
            if (!raw.startsWith(PREFIX)) return;

            const args = raw.slice(PREFIX.length).trim().split(/\s+/);
            const commandName = args.shift()?.toLowerCase();
            if (!commandName) return;

            const command = client.prefixCommands.get(commandName)
                || client.prefixCommands.get(client.aliases.get(commandName));

            if (!command) return; // silently ignore — other bots may handle it

            try {
                await command.execute(message, args, client);
            } catch (error) {
                console.error("[mod-bot] Command execution error:", error);
                await replyEmbed(message, {
                    type: "error",
                    title: "❌ Error",
                    description: "There was an error while executing this command!",
                });
            }
        } catch (err) {
            console.error("[mod-bot] messageCreate error:", err);
        }
    }
};
