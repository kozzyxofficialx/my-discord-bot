import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { generalHelpCommands, funHelpCommands } from "../../utils/constants.js";

// Helper builder function since it was local in KozzyX.js
export function buildHelpPages(commands, iconTitle) {
    const pages = [];
    for (let i = 0; i < commands.length; i += 3) {
        const pageCommands = commands.slice(i, i + 3).join("\n\n");
        const pageNum = pages.length + 1;
        const total = Math.ceil(commands.length / 3);

        pages.push(
            new EmbedBuilder()
                .setTitle(`${iconTitle} (${pageNum}/${total})`)
                .setDescription(pageCommands)
                .setColor(0x5865f2)
        );
    }
    return pages;
}

export const helpPages = {
    general: buildHelpPages(generalHelpCommands, "📚 General Help"),
    fun: buildHelpPages(funHelpCommands, "🎉 Fun Help"),
};

async function sendPagedHelp(interaction, category, page = 0) {
    const pages = helpPages[category];
    const embed = pages[page];

    // Create new Components for the response
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`help_prev:${category}:${page}`)
            .setLabel("⬅ Previous")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId(`help_next:${category}:${page}`)
            .setLabel("Next ➡")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === pages.length - 1)
    );
    return safeRespond(interaction, { embeds: [embed], components: [row] });
}

export default {
    data: { name: "help", description: "Show help pages" },
    async execute(i) {
        return sendPagedHelp(i, "general", 0);
    },
    // Export helper for interactionCreate to use
    sendPagedHelp
};
