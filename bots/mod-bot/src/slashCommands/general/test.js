import { safeRespond } from "../../utils/helpers.js";

export default {
    data: {
        name: "test",
        description: "Test if the bot is working.",
    },

    async execute(interaction) {
        return safeRespond(interaction, { content: "good", ephemeral: false });
    },
};
