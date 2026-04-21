import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";

export const modHelpPages = [];
modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Moderator Help (1/4)")
        .setDescription(
            "🔧 Moderation\n\n" +
            "`,kick @user [reason]` – Kick a user.\n" +
            "`,ban @user [reason]` – Ban a user.\n" +
            "`,damage @user <time>` – Timeout a user (e.g. 10m, 1h).\n" +
            "`,heal @user` – Remove a timeout.\n\n" +
            "🧾 Cases\n\n" +
            "`,case_channel #channel` – Set where moderation/ticket cases are posted.\n"
        )
        .setColor(0xed4245)
);
modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Moderator Help (2/4)")
        .setDescription(
            "🎫 Tickets\n\n" +
            "`,ticket_channel #channel` – Set ticket panel channel.\n" +
            "`,ticket` – Post ticket panel.\n" +
            "`,ticket_edit ...` – Edit categories/title/text.\n" +
            "`,ticket_close <time|off>` – Auto-close time (30m, 2h, 1d).\n" +
            "`,ticket_ping @role` – Display role in tickets (won’t ping).\n"
        )
        .setColor(0xed4245)
);
modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Moderator Help (3/4)")
        .setDescription(
            "🤖 Autoresponders\n\n" +
            "`,autoresponder add <trigger> <response>`\n" +
            "`,autoresponder remove <trigger>`\n" +
            "`,autoresponder list`\n\n" +
            "🛡️ Autoresponder Filter\n\n" +
            "`,autoresponder_filter_on`\n" +
            "`,autoresponder_filter_off`\n"
        )
        .setColor(0xed4245)
);
modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Moderator Help (4/4)")
        .setDescription(
            "🎭 Booster Role System\n\n" +
            "`,boosterrole create <name>`\n" +
            "`,boosterrole color <hex>`\n\n" +
            "⚠️ Warnings / Thresholds\n\n" +
            "`,warn @user [reason]`\n" +
            "`,warn remove @user [count]`\n" +
            "`,warnings [@user]`\n" +
            "`,clearwarns @user`\n" +
            "`,warnthreshold add <count> <action> [minutes]`\n" +
            "`,warnthreshold remove <count>`\n" +
            "`,warnthreshold list`\n\n" +
            "🧱 Channel Tools\n\n" +
            "`,lock [#channel] [reason]`\n" +
            "`,unlock [#channel]`\n" +
            "`,slowmode [#channel] <seconds|off>`\n" +
            "`,clear <amount>`\n" +
            "`,nick @user <new nickname>`\n" +
            "`,nicklock @user` / `,nickunlock @user`\n\n" +
            "🎨 Embeds\n\n" +
            "`,embed_<type>_#hex` – Set per-type embed color.\n" +
            "Example: `,embed_ticket_#57F287`"
        )
        .setColor(0xed4245)
);

async function sendModHelpPage(interaction, page = 0) {
    const embed = modHelpPages[page];
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`modhelp_prev:${page}`)
            .setLabel("⬅ Previous")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId(`modhelp_next:${page}`)
            .setLabel("Next ➡")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === modHelpPages.length - 1)
    );
    return safeRespond(interaction, { embeds: [embed], components: [row] });
}

export default {
    data: { name: "modhelp", description: "Show moderation help pages" },
    async execute(i) {
        return sendModHelpPage(i, 0);
    },
    // Export for interactionCreate
    sendModHelpPage,
    modHelpPages
};
