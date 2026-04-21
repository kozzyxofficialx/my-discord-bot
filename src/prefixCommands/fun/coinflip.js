import { replyEmbed } from "../../utils/embeds.js";

export default {
    name: "coinflip",
    aliases: ["coin", "flip"],
    async execute(message, args) {
        const res = Math.random() < 0.5 ? "Heads" : "Tails";
        return replyEmbed(message, {
            type: "info",
            title: "🪙 Coin Flip",
            description: `It's **${res}**!`
        });
    }
};
