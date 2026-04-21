import { safeRespond } from "../../utils/helpers.js";

export default {
    data: {
        name: "coinflip",
        description: "Flip a coin.",
    },

    async execute(interaction) {
        const result = Math.random() < 0.5 ? "🪙 Heads" : "🪙 Tails";
        return safeRespond(interaction, { content: result, ephemeral: false });
    },
};
