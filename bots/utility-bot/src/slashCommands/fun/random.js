import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";

export default {
    data: {
        name: "random",
        description: "Generate something random",
        options: [
            {
                name: "number",
                description: "Get a random number",
                type: 1, // SUB_COMMAND
                options: [
                    { name: "min", description: "Minimum value (default 1)", type: 4, required: false },
                    { name: "max", description: "Maximum value (default 100)", type: 4, required: false }
                ]
            },
            {
                name: "user",
                description: "Pick a random member from the server",
                type: 1 // SUB_COMMAND
            },
            {
                name: "coinflip",
                description: "Flip a coin",
                type: 1 // SUB_COMMAND
            },
            {
                name: "dice",
                description: "Roll a dice",
                type: 1, // SUB_COMMAND
                options: [
                    { name: "sides", description: "Number of sides (default 6)", type: 4, required: false }
                ]
            }
        ]
    },
    async execute(i) {
        const sub = i.options.getSubcommand();
        let title = "🎲 Random";
        let description = "";

        if (sub === "number") {
            const min = i.options.getInteger("min") ?? 1;
            const max = i.options.getInteger("max") ?? 100;
            const res = Math.floor(Math.random() * (max - min + 1)) + min;
            title = "🔢 Random Number";
            description = `Result: **${res}** (Range: ${min}-${max})`;
        } else if (sub === "user") {
            if (!i.guild) {
                return safeRespond(i, { content: "This subcommand can only be used in a server.", ephemeral: true });
            }
            await i.guild.members.fetch().catch(() => {});
            const members = i.guild.members.cache.filter(m => !m.user.bot);
            const randomMember = members.random();
            title = "👤 Random User";
            description = randomMember ? `I picked: ${randomMember}` : "Couldn't find any members!";
        } else if (sub === "coinflip") {
            const res = Math.random() < 0.5 ? "Heads" : "Tails";
            title = "🪙 Coin Flip";
            description = `It's **${res}**!`;
        } else if (sub === "dice") {
            const sides = i.options.getInteger("sides") ?? 6;
            if (sides < 1) {
                return safeRespond(i, { content: "Dice must have at least 1 side.", ephemeral: true });
            }
            const res = Math.floor(Math.random() * sides) + 1;
            title = "🎲 Dice Roll";
            description = `You rolled a **${res}** on a **${sides}**-sided die.`;
        }

        return safeRespond(i, asEmbedPayload({
            guildId: i.guild?.id,
            type: "info",
            title,
            description,
            footerUser: i.user,
            client: i.client
        }));
    }
};
