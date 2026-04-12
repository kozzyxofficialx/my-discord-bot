import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";

export const modHelpPages = [];
modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Moderator Help (1/5)")
        .setDescription(
            "🔧 Moderation\n\n" +
            "`,kick @user [reason]` – Kick a user.\n" +
            "`,ban @user [reason]` – Ban a user.\n" +
            "`,damage @user <time>` – Timeout a user (e.g. 10m, 1h).\n" +
            "`,heal @user` – Remove a timeout.\n\n" +
            "🧾 Cases & Audit\n\n" +
            "`,case_channel #channel` – Set where moderation cases are posted.\n" +
            "`,audit @user` – View audit log history for a user.\n"
        )
        .setColor(0xed4245)
);
modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Moderator Help (2/5)")
        .setDescription(
            "🎫 Tickets\n\n" +
            "`,ticket_channel #channel` – Set ticket panel channel.\n" +
            "`,ticket` – Post the ticket panel.\n" +
            "`,ticket_edit title/text/add/remove/list` – Edit panel.\n" +
            "`,ticket_close <30m|2h|1d|off>` – Set auto-close timer.\n" +
            "`,ticket_ping @role` – Display role in tickets (won't ping).\n"
        )
        .setColor(0xed4245)
);
modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Moderator Help (3/5)")
        .setDescription(
            "🤖 Autoresponders\n\n" +
            "`,autoresponder add <trigger> <response>`\n" +
            "`,autoresponder remove <trigger>`\n" +
            "`,autoresponder list`\n" +
            "`,autoresponder_filter_on` / `,autoresponder_filter_off`\n\n" +
            "🛡️ Anti-Raid & Appeals\n\n" +
            "`,unraid` – Lift a raid lockdown (Admin only).\n" +
            "`,appealschannel #channel` – Set the ban appeals channel.\n"
        )
        .setColor(0xed4245)
);
modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Moderator Help (4/5)")
        .setDescription(
            "⚠️ Warnings / Thresholds\n\n" +
            "`,warn @user [reason]` – Warn a user.\n" +
            "`,warn remove @user [count]` – Remove warnings.\n" +
            "`,warnings [@user]` – View warning count.\n" +
            "`,clearwarns @user` – Clear all warnings.\n" +
            "`,warnthreshold add <count> <action> [minutes]`\n" +
            "`,warnthreshold remove <count>`\n" +
            "`,warnthreshold list`\n"
        )
        .setColor(0xed4245)
);
modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Moderator Help (5/5)")
        .setDescription(
            "🧱 Channel Tools\n\n" +
            "`,lock [#channel] [reason]` – Lock a channel.\n" +
            "`,unlock [#channel]` – Unlock a channel.\n" +
            "`,slowmode [#channel] <seconds|off>` – Set slowmode.\n" +
            "`,clear <amount>` – Delete messages (1–100).\n" +
            "`,nick @user <new nickname>` – Change nickname.\n" +
            "`,nicklock @user` / `,nickunlock @user` – Lock/unlock nickname.\n\n" +
            "🎭 Booster Role System\n\n" +
            "`,boosterrole create <name>` – Create a custom role.\n" +
            "`,boosterrole color <hex>` – Change your role color.\n\n" +
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
    sendModHelpPage,
    modHelpPages
};
