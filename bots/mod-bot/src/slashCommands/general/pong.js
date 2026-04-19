import { safeRespond } from "../../utils/helpers.js";

export default {
    data: {
        name: "pong",
        description: "Replies with /ping.",
    },

    async execute(interaction) {
        return safeRespond(interaction, { content: "/ping", ephemeral: false });
    },
};
