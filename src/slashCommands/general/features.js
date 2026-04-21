import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { featureList } from "../../utils/constants.js";

export const featureHelpPages = [];
for (let i = 0; i < featureList.length; i += 3) {
    const slice = featureList.slice(i, i + 3);
    featureHelpPages.push(
        new EmbedBuilder()
            .setTitle(`🔧 Bot Features (${featureHelpPages.length + 1}/${Math.ceil(featureList.length / 3)})`)
            .setColor(0xed4245)
            .setDescription("Here are the bot’s background systems and automatic features:")
            .addFields(slice.map((f) => ({ name: f.name, value: f.value })))
    );
}

async function sendFeatureHelpPage(interaction, page = 0) {
    const embed = featureHelpPages[page];
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`features_prev:${page}`)
            .setLabel("⬅ Previous")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId(`features_next:${page}`)
            .setLabel("Next ➡")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === featureHelpPages.length - 1)
    );
    return safeRespond(interaction, { embeds: [embed], components: [row] });
}

export default {
    data: { name: "features", description: "Show bot features pages" },
    async execute(i) {
        return sendFeatureHelpPage(i, 0);
    },
    // Export for interactionCreate
    sendFeatureHelpPage,
    featureHelpPages
};
