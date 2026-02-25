import { Events } from "discord.js";
import { safeRespond } from "../utils/helpers.js";
import { asEmbedPayload } from "../utils/embeds.js";

// Restore imports if you have button handlers etc, but for now let's focus on commands
// import { helpPages, sendPagedHelp } from "../slashCommands/general/help.js";
// ... other imports

export default {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        console.log(`[Interaction] Received type: ${interaction.type} | ID: ${interaction.id}`);

        // --- SLASH COMMANDS ---
        if (interaction.isChatInputCommand()) {
            const cmdName = interaction.commandName;
            console.log(`[Interaction] Slash Command: ${cmdName}`);

            const command = client.slashCommands.get(cmdName);

            if (!command) {
                console.error(`[Interaction] ❌ Command '${cmdName}' not found in registry.`);
                console.error(`[Interaction] Available: ${[...client.slashCommands.keys()].join(", ")}`);

                return safeRespond(interaction, {
                    content: `❌ Command \`${cmdName}\` not found internally. This may be a deployment mismatch.`,
                    ephemeral: true
                });
            }

            try {
                console.log(`[Interaction] Executing '${cmdName}'...`);
                await command.execute(interaction);
                console.log(`[Interaction] Execution of '${cmdName}' successful.`);
            } catch (error) {
                console.error(`[Interaction] ❌ Execution failed for '${cmdName}':`, error);
                await safeRespond(interaction, {
                    content: `❌ An internal error occurred while executing \`${cmdName}\`. Check logs.`,
                    ephemeral: true
                });
            }
            return;
        }

        // --- BUTTONS / OTHER (Placeholder for now until commands work) ---
        if (interaction.isButton()) {
            // ... Logic for buttons
            // For now just ack to prevent failure
            console.log(`[Interaction] Button clicked: ${interaction.customId}`);
            // return interaction.deferUpdate().catch(() => {});
        }
    }
};
