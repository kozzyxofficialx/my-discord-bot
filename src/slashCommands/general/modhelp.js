import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";

export const modHelpPages = [];

modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Moderator Help (1/7) — Moderation")
        .setDescription(
            "**🔨 Actions**\n" +
            "`,kick @user [reason]` – Kick a user.\n" +
            "`,ban @user [reason]` – Ban a user.\n" +
            "`,softban @user [reason]` – Ban + instant unban (clears messages).\n" +
            "`,damage @user <time>` – Timeout (e.g. `10m`, `1h`, `7d`).\n" +
            "`,heal @user` – Remove a timeout.\n\n" +
            "**⚠️ Warnings**\n" +
            "`,warn @user [reason]` – Issue a warning.\n" +
            "`,warn remove @user [count]` – Remove N warnings.\n" +
            "`,warnings [@user]` – View warning history.\n" +
            "`,clearwarns @user` – Clear all warnings.\n\n" +
            "**📋 Warn Thresholds** (auto-punish on warn count)\n" +
            "`,warnthreshold add <count> <timeout|kick|ban> [minutes]`\n" +
            "`,warnthreshold remove <count>`\n" +
            "`,warnthreshold list`"
        )
        .setColor(0xed4245)
);

modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Moderator Help (2/7) — Channel & Nick Tools")
        .setDescription(
            "**🧱 Channel Tools**\n" +
            "`,lock [#channel] [reason]` – Lock a channel.\n" +
            "`,unlock [#channel]` – Unlock a channel.\n" +
            "`,slowmode [#channel] <seconds|off>` – Set slowmode.\n" +
            "`,clear <amount>` – Delete messages (up to 100).\n" +
            "`/nuke [amount]` – Bulk-delete up to 1000 messages.\n\n" +
            "**🪪 Nicknames**\n" +
            "`,nick @user <nickname>` – Set a user's nickname.\n" +
            "`,nicklock @user [nickname]` – Lock a user's nickname.\n" +
            "`,nickunlock @user` – Unlock a user's nickname.\n\n" +
            "**📝 Audit Log**\n" +
            "`,audit @user` – View audit log for a user *(requires Audit Log plugin)*.\n\n" +
            "**📊 Info**\n" +
            "`/userinfo [@user]` – View user profile.\n" +
            "`/serverinfo` – View server info.\n" +
            "`/invites [@user]` – Invite stats *(requires Invite Tracking plugin)*."
        )
        .setColor(0xed4245)
);

modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Moderator Help (3/7) — Anti-Raid")
        .setDescription(
            "**🛡️ Anti-Raid Config** *(enable first: `/plugins enable Anti-Raid`)*\n" +
            "`,antiraid show` – View current config.\n" +
            "`,antiraid threshold <n>` – Joins to trigger (default: 10).\n" +
            "`,antiraid window <duration>` – Detection window (default: 1m).\n" +
            "`,antiraid action <lockdown|kick|ban>` – Action on raid.\n" +
            "`,antiraid minage <duration|off>` – Auto-kick accounts younger than this during spikes.\n" +
            "`,antiraid mention <n|off>` – Mass-mention threshold per message.\n" +
            "`,antiraid mentiontime <duration>` – Timeout length for mass-mentioners.\n" +
            "`,antiraid alertchannel <#channel|off>` – Where raid alerts post.\n\n" +
            "**🚨 Raid Recovery**\n" +
            "`,unraid` – Lift an active lockdown.\n" +
            "`,banraid` – Ban all raiders from the last raid.\n" +
            "`,raidlist` – List raider IDs from the last raid.\n\n" +
            "**🧪 Testing**\n" +
            "`/antiraid test [count]` – Simulate a join spike to verify config.\n\n" +
            "**🚫 Bad Words Filter**\n" +
            "`,badwords list` – Show filter list.\n" +
            "`,badwords add <word>` – Add a word.\n" +
            "`,badwords remove <word>` – Remove a word.\n" +
            "`,badwords clear` – Clear the whole filter."
        )
        .setColor(0xed4245)
);

modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Moderator Help (4/7) — Tickets")
        .setDescription(
            "**🎫 Ticket Setup**\n" +
            "`,ticket_channel #channel` – Set where the ticket panel posts.\n" +
            "`,ticket` – (Re)post the ticket panel.\n\n" +
            "**✏️ Panel Customization**\n" +
            "`,ticket_edit title <new title>` – Change panel title.\n" +
            "`,ticket_edit text <new text>` – Change panel description.\n" +
            "`,ticket_edit add <id> <label> [primary|secondary|success|danger]` – Add category.\n" +
            "`,ticket_edit remove <id>` – Remove a category.\n" +
            "`,ticket_edit list` – List all categories.\n\n" +
            "**⚙️ Ticket Behaviour**\n" +
            "`,ticket_close <30m|2h|1d|off>` – Auto-close idle tickets.\n" +
            "`,ticket_ping @role` – Display role in tickets (no ping).\n\n" +
            "**🧾 Cases & Appeals**\n" +
            "`,case_channel #channel` – Set mod/ticket case log channel.\n" +
            "`,appeals_channel #channel` – Set where appeal cases go.\n" +
            "*(Enable appeals: `/plugins enable Ban Appeals`)*"
        )
        .setColor(0xed4245)
);

modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Moderator Help (5/7) — Autoresponders & Booster")
        .setDescription(
            "**🤖 Autoresponders**\n" +
            "`,autoresponder add <trigger> <response>` – Add a response.\n" +
            "`,autoresponder remove <trigger>` – Remove a response.\n" +
            "`,autoresponder list` – List all.\n\n" +
            "**🛡️ Autoresponder Filter**\n" +
            "`,autoresponder_filter_on` – Enable the filter.\n" +
            "`,autoresponder_filter_off` – Disable the filter.\n\n" +
            "**💜 Booster Role System**\n" +
            "`,boosterrole create <name>` – Create a custom role for yourself (boosters only).\n" +
            "`,boosterrole color <#hex>` – Change your booster role colour.\n\n" +
            "**😴 AFK**\n" +
            "`,afk [reason]` – Set yourself AFK.\n" +
            "`,clearafk [@user]` – Clear AFK status (mod clears others).\n\n" +
            "**📨 Invites**\n" +
            "`/invites [@user]` – View invite stats.\n" +
            "*(Enable: `/plugins enable Invite Tracking`)*"
        )
        .setColor(0xed4245)
);

modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Moderator Help (6/7) — Embed Colors & Appearance")
        .setDescription(
            "**🎨 Embed Colors**\n" +
            "Customize the color of every embed type bot-wide.\n\n" +
            "`,color list` – Show all current colors.\n" +
            "`,color set <type> <#hex>` – Set a color.\n" +
            "`,color reset [type]` – Reset one or all to defaults.\n\n" +
            "**Color types:** `info`, `success`, `warning`, `error`,\n" +
            "`ticket`, `mod`, `case`, `afk`, `autoresponder`, `settings`\n\n" +
            "**Example:**\n" +
            "`,color set ticket #57F287`\n" +
            "`,color set error #FF0000`\n" +
            "`,color reset` *(resets all)*"
        )
        .setColor(0xed4245)
);

modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Moderator Help (7/7) — Plugins & Setup")
        .setDescription(
            "**🔌 Plugins**\n" +
            "`/plugins list` – See all plugins and their status.\n" +
            "`/plugins enable <plugin>` – Enable a plugin.\n" +
            "`/plugins disable <plugin>` – Disable a plugin.\n\n" +
            "**Available plugins:** `Conversation Memory`, `AI Moderation`,\n" +
            "`Dynamic VC`, `Invite Tracking`, `Anti-Raid`, `Ban Appeals`, `Audit Log`\n\n" +
            "**⚙️ Server Setup**\n" +
            "`/server_setup preset <preset>` – Auto-create roles, channels, categories.\n" +
            "`/redo_server_setup` – Tear down and optionally rerun setup.\n\n" +
            "**🔊 Dynamic Voice Channels** *(enable Dynamic VC plugin first)*\n" +
            "`/vc setup <trigger> [category] [user_limit]` – Configure.\n" +
            "`/vc rename <name>` – Rename your VC.\n" +
            "`/vc limit <n>` – Set user limit.\n" +
            "`/vc lock` / `/vc unlock` – Lock/unlock your VC.\n\n" +
            "**📊 Bot Info**\n" +
            "`/stats` – Bot statistics & uptime.\n" +
            "`/pong` – Latency check."
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
    data: { name: "modhelp", description: "Show moderation & configuration help" },
    async execute(i) {
        return sendModHelpPage(i, 0);
    },
    sendModHelpPage,
    modHelpPages,
};
