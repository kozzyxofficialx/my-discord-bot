import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";

export default {
    data: { name: "topic", description: "Get a random conversation topic" },
    async execute(i) {
        const topics = [
            "If you could instantly learn one skill, what would it be?",
            "What’s the best game you’ve played this year?",
            "What’s a movie everyone loves that you didn’t?",
            "What’s your dream vacation?",
            "What’s a random fact you know?",
            "What song do you never skip?",
            "If you could meet any historical figure, who would it be?",
            "What’s the best food combo that sounds weird but works?",
            "What’s a goal you want to achieve this month?",
        ];
        const pick = topics[Math.floor(Math.random() * topics.length)];
        return safeRespond(i, asEmbedPayload({ guildId: i.guild?.id, type: "info", title: "💬 Topic", description: pick, client: i.client }));
    }
};
