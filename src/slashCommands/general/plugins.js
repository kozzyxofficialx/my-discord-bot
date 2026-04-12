import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";

const PLUGIN_META = {
    conversation_memory: { label: "Conversation Memory",  desc: "Claude remembers your chat history in /ask across sessions." },
    ai_moderation:       { label: "AI Moderation",        desc: "Claude auto-flags and deletes toxic/harmful messages." },
    dynamic_vc:          { label: "Dynamic Voice Channels", desc: "Auto-create personal VCs when users join a trigger channel." },
    invite_tracking:     { label: "Invite Tracking",      desc: "Track who invited each member. Shows on /userinfo." },
    anti_raid:           { label: "Anti-Raid",            desc: "Detect and lock down the server during join-rate spikes." },
    appeals:             { label: "Ban Appeals",          desc: "Banned users receive a DM with an appeal option." },
    audit_log:           { label: "Audit Log",            desc: "Persist Discord audit log entries to SQLite for searching." },
};

export default {
    data: {
        name: "plugins",
        description: "Enable or disable optional bot features.",
        default_member_permissions: String(PermissionsBitField.Flags.ManageGuild),
        dm_permission: false,
        options: [
            {
                name: "list",
                description: "Show all plugins and their current status.",
                type: 1, // SUB_COMMAND
            },
            {
                name: "enable",
                description: "Enable a plugin for this server.",
                type: 1,
                options: [{ name: "plugin", description: "Plugin to enable.", type: 3, required: true, choices: Object.keys(PLUGIN_META).map(k => ({ name: PLUGIN_META[k].label, value: k })) }],
            },
            {
                name: "disable",
                description: "Disable a plugin for this server.",
                type: 1,
                options: [{ name: "plugin", description: "Plugin to disable.", type: 3, required: true, choices: Object.keys(PLUGIN_META).map(k => ({ name: PLUGIN_META[k].label, value: k })) }],
            },
        ],
    },

    async execute(interaction) {
        if (!interaction.guildId) return;
        const settings = getGuildSettings(interaction.guildId);
        const sub = interaction.options.getSubcommand();

        if (sub === "list") {
            const lines = Object.entries(PLUGIN_META).map(([key, meta]) => {
                const on = settings.plugins[key];
                return `${on ? "🟢" : "⚫"} **${meta.label}** — ${meta.desc}`;
            });
            return safeRespond(interaction, asEmbedPayload({
                guildId: interaction.guildId,
                type: "settings",
                title: "🔌 Plugins",
                description: lines.join("\n"),
                ephemeral: true,
            }));
        }

        const plugin = interaction.options.getString("plugin");
        if (!PLUGIN_META[plugin]) {
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Unknown plugin", description: `No plugin named \`${plugin}\`.`, ephemeral: true }));
        }

        const enabling = sub === "enable";
        settings.plugins[plugin] = enabling;
        await saveSettings();

        return safeRespond(interaction, asEmbedPayload({
            guildId: interaction.guildId,
            type: "success",
            title: `${enabling ? "🟢 Enabled" : "⚫ Disabled"}: ${PLUGIN_META[plugin].label}`,
            description: PLUGIN_META[plugin].desc,
            ephemeral: true,
        }));
    },
};
