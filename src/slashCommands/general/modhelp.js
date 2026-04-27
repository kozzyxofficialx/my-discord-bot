import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";

// ── MOD HELP PAGES (prefix: ,) ───────────────────────────────────────────
export const modHelpPages = [];

modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Mod Help (1/4) — Moderation Actions")
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
            "**📋 Warn Thresholds**\n" +
            "`,warnthreshold add <count> <timeout|kick|ban> [minutes]`\n" +
            "`,warnthreshold remove <count>`\n" +
            "`,warnthreshold list`"
        )
        .setColor(0xed4245)
);

modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Mod Help (2/4) — Channel & Nick Tools")
        .setDescription(
            "**🧱 Channel Tools**\n" +
            "`,lock [#channel] [reason]` – Lock a channel.\n" +
            "`,unlock [#channel]` – Unlock a channel.\n" +
            "`,slowmode [#channel] <seconds|off>` – Set slowmode.\n" +
            "`,clear <amount>` – Delete up to 100 messages.\n" +
            "`/nuke [amount]` – Bulk-delete up to 1000 messages.\n\n" +
            "**🪪 Nicknames**\n" +
            "`,nick @user <nickname>` – Set nickname.\n" +
            "`,nicklock @user [nickname]` – Lock nickname.\n" +
            "`,nickunlock @user` – Unlock nickname.\n\n" +
            "**🛡️ Anti-Raid Recovery**\n" +
            "`,unraid` – Lift an active lockdown.\n" +
            "`,banraid` – Ban all raiders from last raid.\n" +
            "`,raidlist` – List raider IDs.\n" +
            "`/antiraid test [count]` – Simulate a join spike.\n\n" +
            "**📝 Audit & Info**\n" +
            "`,audit @user` – Audit log *(requires plugin)*.\n" +
            "`/userinfo [@user]` · `/serverinfo` · `/invites [@user]`"
        )
        .setColor(0xed4245)
);

modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Mod Help (3/4) — Warnings, Booster & AFK")
        .setDescription(
            "**🎭 Booster Role System**\n" +
            "`,boosterrole create <name>` – Create a custom role (boosters only).\n" +
            "`,boosterrole color <#hex>` – Change your booster role colour.\n\n" +
            "**😴 AFK**\n" +
            "`,afk [reason]` – Set yourself AFK.\n" +
            "`,clearafk [@user]` – Clear AFK status.\n\n" +
            "**🤖 Autoresponders**\n" +
            "Use `!autoresponder` (config prefix) — see ⚙️ Config tab.\n\n" +
            "**📊 Bot Info**\n" +
            "`/stats` – Bot statistics & uptime.\n" +
            "`/pong` – Latency check."
        )
        .setColor(0xed4245)
);

modHelpPages.push(
    new EmbedBuilder()
        .setTitle("🔧 Mod Help (4/4) — Plugins & Setup")
        .setDescription(
            "**🔌 Plugins**\n" +
            "`/plugins list` – See all plugins and their status.\n" +
            "`/plugins enable <plugin>` – Enable a plugin.\n" +
            "`/plugins disable <plugin>` – Disable a plugin.\n\n" +
            "**Available:** `Conversation Memory`, `AI Moderation`, `Dynamic VC`,\n" +
            "`Invite Tracking`, `Anti-Raid`, `Ban Appeals`, `Audit Log`\n\n" +
            "**⚙️ Server Setup**\n" +
            "`/server_setup preset <preset>` – Auto-create roles, channels, categories.\n" +
            "`/redo_server_setup` – Tear down and optionally rerun setup.\n\n" +
            "**🔊 Dynamic Voice Channels** *(enable Dynamic VC plugin first)*\n" +
            "`/vc setup` · `/vc rename` · `/vc limit` · `/vc lock` · `/vc unlock`\n\n" +
            "**💡 Tip:** Use the **⚙️ Config** button for all `!` customization commands."
        )
        .setColor(0xed4245)
);

// ── CONFIG HELP PAGES (prefix: !) ────────────────────────────────────────
export const configHelpPages = [];

configHelpPages.push(
    new EmbedBuilder()
        .setTitle("⚙️ Config Help (1/4) — Anti-Raid & Bad Words")
        .setDescription(
            "**🛡️ Anti-Raid Config** *(enable: `/plugins enable Anti-Raid`)*\n" +
            "`!antiraid show` – View current config.\n" +
            "`!antiraid threshold <n>` – Joins to trigger (default: 10).\n" +
            "`!antiraid window <duration>` – Detection window (default: 1m).\n" +
            "`!antiraid action <lockdown|kick|ban>` – Action on raid.\n" +
            "`!antiraid minage <duration|off>` – Auto-kick new accounts during spikes.\n" +
            "`!antiraid mention <n|off>` – Mass-mention threshold per message.\n" +
            "`!antiraid mentiontime <duration>` – Timeout length for mass-mentioners.\n" +
            "`!antiraid alertchannel <#channel|off>` – Where raid alerts post.\n\n" +
            "**🚫 Bad Words Filter**\n" +
            "`!badwords list` – Show filter list.\n" +
            "`!badwords add <word>` – Add a word.\n" +
            "`!badwords remove <word>` – Remove a word.\n" +
            "`!badwords clear` – Clear the whole filter."
        )
        .setColor(0x5865f2)
);

configHelpPages.push(
    new EmbedBuilder()
        .setTitle("⚙️ Config Help (2/4) — Tickets")
        .setDescription(
            "**🎫 Ticket Setup**\n" +
            "`!ticket_channel #channel` – Set where the ticket panel posts.\n" +
            "`!ticket` – (Re)post the ticket panel.\n\n" +
            "**✏️ Panel Customization**\n" +
            "`!ticket_edit title <new title>` – Change panel title.\n" +
            "`!ticket_edit text <new text>` – Change panel description.\n" +
            "`!ticket_edit add <id> <label> [primary|secondary|success|danger]` – Add category.\n" +
            "`!ticket_edit remove <id>` – Remove a category.\n" +
            "`!ticket_edit list` – List all categories.\n\n" +
            "**⚙️ Ticket Behaviour**\n" +
            "`!ticket_close <30m|2h|1d|off>` – Auto-close idle tickets.\n" +
            "`!ticket_ping @role` – Display role in tickets (no ping).\n\n" +
            "**🧾 Case & Appeal Channels**\n" +
            "`!case_channel #channel` – Set mod/ticket case log channel.\n" +
            "`!appeals_channel #channel` – Set where appeal cases go."
        )
        .setColor(0x5865f2)
);

configHelpPages.push(
    new EmbedBuilder()
        .setTitle("⚙️ Config Help (3/4) — Autoresponders")
        .setDescription(
            "**🤖 Autoresponders**\n" +
            "`!autoresponder add <trigger> <response>` – Add a response.\n" +
            "`!autoresponder remove <trigger>` – Remove a response.\n" +
            "`!autoresponder list` – List all.\n\n" +
            "**🛡️ Autoresponder Filter**\n" +
            "`!autoresponder_filter_on` – Enable the autoresponder filter.\n" +
            "`!autoresponder_filter_off` – Disable the autoresponder filter.\n\n" +
            "**💡 How it works:**\n" +
            "When a message contains a trigger word/phrase, the bot replies with the configured response. " +
            "The filter toggle controls whether filtering applies to autoresponder content."
        )
        .setColor(0x5865f2)
);

configHelpPages.push(
    new EmbedBuilder()
        .setTitle("⚙️ Config Help (4/4) — Embed Colors")
        .setDescription(
            "**🎨 Embed Colors**\n" +
            "Customize the color of every embed type bot-wide.\n\n" +
            "`!color list` – Show all current colors.\n" +
            "`!color set <type> <#hex>` – Set a color.\n" +
            "`!color reset [type]` – Reset one type or all to defaults.\n\n" +
            "**Color types:**\n" +
            "`info`  `success`  `warning`  `error`\n" +
            "`ticket`  `mod`  `case`  `afk`  `autoresponder`  `settings`\n\n" +
            "**Examples:**\n" +
            "`!color set ticket #57F287`\n" +
            "`!color set error #FF0000`\n" +
            "`!color reset` *(resets all)*"
        )
        .setColor(0x5865f2)
);

// ── BUTTON BUILDERS ───────────────────────────────────────────────────────
export function modRow(page) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`modhelp_prev:${page}`)
            .setLabel("⬅ Previous")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId(`modhelp_next:${page}`)
            .setLabel("Next ➡")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === modHelpPages.length - 1),
        new ButtonBuilder()
            .setCustomId("modhelp_switch:config:0")
            .setLabel("⚙️ Config")
            .setStyle(ButtonStyle.Success),
    );
}

export function configRow(page) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`cfghelp_prev:${page}`)
            .setLabel("⬅ Previous")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId(`cfghelp_next:${page}`)
            .setLabel("Next ➡")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === configHelpPages.length - 1),
        new ButtonBuilder()
            .setCustomId("modhelp_switch:mod:0")
            .setLabel("🔧 Mod Help")
            .setStyle(ButtonStyle.Danger),
    );
}

export async function sendModHelpPage(interaction, page = 0) {
    return safeRespond(interaction, { embeds: [modHelpPages[page]], components: [modRow(page)] });
}

export default {
    data: { name: "modhelp", description: "Show moderation & configuration help" },
    async execute(i) {
        return sendModHelpPage(i, 0);
    },
    sendModHelpPage,
    modHelpPages,
    configHelpPages,
    modRow,
    configRow,
};
