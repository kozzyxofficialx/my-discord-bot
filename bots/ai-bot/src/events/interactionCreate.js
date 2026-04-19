import { Events } from "discord.js";
import { safeRespond } from "../utils/helpers.js";

export default {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isChatInputCommand()) return;

        const cmdName = interaction.commandName;
        const command = client.slashCommands.get(cmdName);

        if (!command) {
            console.error(`[Interaction] ❌ Command '${cmdName}' not found.`);
            return safeRespond(interaction, { content: `❌ Command \`${cmdName}\` not found.`, ephemeral: true });
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`[Interaction] ❌ Execution failed for '${cmdName}':`, error);
            await safeRespond(interaction, { content: `❌ Internal error while executing \`${cmdName}\`.`, ephemeral: true });
        }
    }
};
