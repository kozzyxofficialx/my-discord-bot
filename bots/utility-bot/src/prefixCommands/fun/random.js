import { replyEmbed } from "../../utils/embeds.js";

export default {
    name: "random",
    aliases: ["rng"],
    async execute(message, args) {
        const sub = args[0]?.toLowerCase();
        let title = "🎲 Random";
        let description = "";

        if (sub === "number") {
            const min = parseInt(args[1]) || 1;
            const max = parseInt(args[2]) || 100;
            const res = Math.floor(Math.random() * (Math.abs(max - min) + 1)) + Math.min(min, max);
            title = "🔢 Random Number";
            description = `Result: **${res}** (Range: ${Math.min(min, max)}-${Math.max(min, max)})`;
        } else if (sub === "user") {
            if (!message.guild) return;
            await message.guild.members.fetch().catch(() => {});
            const members = message.guild.members.cache.filter(m => !m.user.bot);
            const randomMember = members.random();
            title = "👤 Random User";
            description = randomMember ? `I picked: ${randomMember}` : "Couldn't find any members!";
        } else if (sub === "coinflip" || sub === "coin" || sub === "flip") {
            const res = Math.random() < 0.5 ? "Heads" : "Tails";
            title = "🪙 Coin Flip";
            description = `It's **${res}**!`;
        } else if (sub === "dice" || sub === "roll") {
            const sides = parseInt(args[1]) || 6;
            if (sides < 1) {
                return replyEmbed(message, { type: "error", title: "❌ Invalid Sides", description: "Dice must have at least 1 side." });
            }
            const res = Math.floor(Math.random() * sides) + 1;
            title = "🎲 Dice Roll";
            description = `You rolled a **${res}** on a **${sides}**-sided die.`;
        } else {
            // Default to random number 1-100
            const res = Math.floor(Math.random() * 100) + 1;
            title = "🔢 Random Number";
            description = `Result: **${res}** (Default Range: 1-100)\n\n*Try: \`,random <number/user/coinflip/dice>\`*`;
        }

        return replyEmbed(message, { type: "info", title, description });
    }
};
