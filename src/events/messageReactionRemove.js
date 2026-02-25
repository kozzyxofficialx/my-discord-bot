import { Events } from "discord.js";
import { adjustWeight, loadWeights } from "../utils/personality.js";

const GENES = ["sarcasm_level", "verbosity", "emoji_density"];

export default {
    name: Events.MessageReactionRemove,
    async execute(reaction, user, client) {
        if (user.bot) return;

        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                return;
            }
        }

        const message = reaction.message;
        if (!message.partial && message.author && message.author.id === client.user.id) {
            // Un-evolve when returning reaction
            const isPositive = ["👍", "❤️", "🔥", "😂"].includes(reaction.emoji.name);
            const isNegative = ["👎", "🗑️", "😡", "🙄"].includes(reaction.emoji.name);

            if (!isPositive && !isNegative) return;

            // Negate the evolution
            const targetGene = GENES[Math.floor(Math.random() * GENES.length)];
            const mutationAmount = isPositive ? -0.2 : 0.2; // reversed

            adjustWeight(targetGene, mutationAmount);
            console.log(`[Evolution] Reversed ${targetGene} by ${mutationAmount} due to unreacted ${reaction.emoji.name}`);
        }
    }
};
