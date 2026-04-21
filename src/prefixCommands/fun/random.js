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
        } else if (sub === "8ball" || sub === "8b") {
            const question = args.slice(1).join(" ");
            if (!question) {
                return replyEmbed(message, { type: "error", title: "🔮 Magic 8-Ball", description: "Please provide a question to ask." });
            }
            const responses = [
                "It is certain.", "It is decidedly so.", "Without a doubt.", "Yes definitely.", "You may rely on it.",
                "As I see it, yes.", "Most likely.", "Outlook good.", "Yes.", "Signs point to yes.",
                "Reply hazy, try again.", "Ask again later.", "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again.",
                "Don't count on it.", "My reply is no.", "My sources say no.", "Outlook not so good.", "Very doubtful."
            ];
            const res = responses[Math.floor(Math.random() * responses.length)];
            title = "🔮 Magic 8-Ball";
            description = `**Question:** ${question}\n**Answer:** ${res}`;
        } else {
            // Default to random number 1-100
            const res = Math.floor(Math.random() * 100) + 1;
            title = "🔢 Random Number";
            description = `Result: **${res}** (Default Range: 1-100)\n\n*Try: \`,random <number/user/coinflip/dice/8ball>\`*`;
        }

        return replyEmbed(message, { type: "info", title, description });
    }
};
