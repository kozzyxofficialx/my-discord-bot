import { Events } from "discord.js";
import { adjustWeight, loadWeights } from "../utils/personality.js";

// Genetic variables to evolve
const GENES = ["sarcasm_level", "verbosity", "emoji_density"];

export default {
    name: Events.MessageReactionAdd,
    async execute(reaction, user, client) {
        if (user.bot) return;

        // Ensure partial structures are fully fetched
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error("Failed to fetch reaction:", error);
                return;
            }
        }

        const message = reaction.message;
        if (!message.partial && message.author && message.author.id === client.user.id) {
            // Evolve based on reaction
            const isPositive = ["👍", "❤️", "🔥", "😂"].includes(reaction.emoji.name);
            const isNegative = ["👎", "🗑️", "😡", "🙄"].includes(reaction.emoji.name);

            if (!isPositive && !isNegative) return; // Only adjust on specific feedbacks

            // Just basic adaptation:
            // Randomly select a gene and mutate it slightly in the direction of the feedback
            // This causes a genetic drift towards what users actually upvote over time.
            const targetGene = GENES[Math.floor(Math.random() * GENES.length)];
            const mutationAmount = isPositive ? 0.2 : -0.2;

            adjustWeight(targetGene, mutationAmount);
            console.log(`[Evolution] Adjusted ${targetGene} by ${mutationAmount} due to ${reaction.emoji.name}`);
        }
    }
};
