import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";

export const modHelpPages = [];
modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Moderator Help (1/5)")
        .setDescription(
            "🔧 Moderation\n\n" +
            "`/kick` – Kick a user.\n" +
            "`/ban` – Ban a user.\n" +
            "`/damage` – Timeout a user (e.g. 10m, 1h).\n" +
            "`/heal` – Remove a timeout.\n\n" +
            "🧾 Cases & Audit\n\n" +
            "`/case_channel` – Set where moderation cases are posted.\n" +
            "`/audit` – View audit log history for a user.\n"
        )
        .setColor(0xed4245)
);
modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Moderator Help (2/5)")
        .setDescription(
            "🎫 Tickets\n\n" +
            "`/ticket_channel` – Set ticket panel channel.\n" +
            "`/ticket` – Post the ticket panel.\n" +
            "`/ticket_edit` – Edit panel title, text, or categories.\n" +
            "`/ticket_close` – Set auto-close timer (30m, 2h, 1d, off).\n" +
            "`/ticket_ping` – Set display role in tickets (won't ping).\n"
        )
        .setColor(0xed4245)
);
modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Moderator Help (3/5)")
        .setDescription(
            "🤖 Autoresponders\n\n" +
            "`/autoresponder add` – Add an autoresponder.\n" +
            "`/autoresponder remove` – Remove an autoresponder.\n" +
            "`/autoresponder list` – List all autoresponders.\n" +
            "`/autoresponder_filter` – Toggle the spam/bad-word filter.\n\n" +
            "🛡️ Anti-Raid & Appeals\n\n" +
            "`/unraid` – Lift a raid lockdown (Admin only).\n" +
            "`/appealschannel` – Set the ban appeals channel.\n"
        )
        .setColor(0xed4245)
);
modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Moderator Help (4/5)")
        .setDescription(
            "⚠️ Warnings / Thresholds\n\n" +
            "`/warn add` – Warn a user.\n" +
            "`/warn remove` – Remove warnings from a user.\n" +
            "`/warnings` – View a user's warning count.\n" +
            "`/clearwarns` – Clear all warnings for a user.\n" +
            "`/warnthreshold add` – Auto-action at a warn count.\n" +
            "`/warnthreshold remove` – Remove a threshold.\n" +
            "`/warnthreshold list` – List all thresholds.\n"
        )
        .setColor(0xed4245)
);
modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Moderator Help (5/5)")
        .setDescription(
            "🧱 Channel Tools\n\n" +
            "`/lock` – Lock a channel.\n" +
            "`/unlock` – Unlock a channel.\n" +
            "`/slowmode` – Set slowmode for a channel.\n" +
            "`/clear` – Delete messages in bulk (1–100).\n" +
            "`/nick` – Change a user's nickname.\n" +
            "`/nicklock` / `/nickunlock` – Lock/unlock a nickname.\n\n" +
            "🎭 Booster Role System\n\n" +
            "`/boosterrole create` – Create a custom booster role.\n" +
            "`/boosterrole color` – Change your role color.\n\n" +
            "🎨 Embeds\n\n" +
            "`/embed_color` – Set per-type embed color.\n"
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
