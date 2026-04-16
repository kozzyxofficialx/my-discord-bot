export default {
    data: {
        name: "ping",
        description: "This was my first command",
        integration_types: [0, 1],
        contexts: [0, 1, 2],
    },
    async execute(i) {
        return i.reply({ content: "pong🏓" });
    }
};
