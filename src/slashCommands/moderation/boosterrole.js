import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { boosterRolesDB, saveBoosterRoles } from "../../utils/database.js";

export default {
    data: {
        name: "boosterrole",
        description: "Create or customize your personal booster role.",
        dm_permission: false,
        options: [
            {
                name: "create", description: "Create a custom booster role.", type: 1,
                options: [{ name: "name", description: "Role name", type: 3, required: true }],
            },
            {
                name: "color", description: "Change your booster role color.", type: 1,
                options: [{ name: "hex", description: "Hex color (e.g. #ff55ff)", type: 3, required: true }],
            },
        ],
    },
    async execute(interaction) {
        const isBooster = interaction.member.roles.cache.some(r => r.tags?.premiumSubscriber);
        const isOwner = interaction.guild.ownerId === interaction.user.id;
        if (!isBooster && !isOwner) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "🚀 Booster Only", description: "Only **Server Boosters** can use this.", ephemeral: true }));

        const sub = interaction.options.getSubcommand();

        if (sub === "create") {
            const name = interaction.options.getString("name");
            const oldId = boosterRolesDB.get(interaction.user.id);
            if (oldId) {
                const old = interaction.guild.roles.cache.get(oldId);
                if (old) await old.delete().catch(() => {});
            }

            const role = await interaction.guild.roles.create({ name, color: "#a64dff" });
            await interaction.member.roles.add(role.id);
            boosterRolesDB.set(interaction.user.id, role.id);
            await saveBoosterRoles();
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "success", title: "💎 Booster Role Created", description: `Created role **${name}** and assigned it to you.` }));
        }

        if (sub === "color") {
            const hex = interaction.options.getString("hex");
            const roleId = boosterRolesDB.get(interaction.user.id);
            if (!roleId) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Not Found", description: "You don't have a booster role yet. Use `/boosterrole create` first.", ephemeral: true }));

            const role = interaction.guild.roles.cache.get(roleId);
            if (!role) return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "error", title: "❌ Missing Role", description: "Your booster role no longer exists. Create a new one.", ephemeral: true }));

            await role.setColor(hex);
            return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "success", title: "🎨 Color Updated", description: `Updated your booster role color to **${hex}**.` }));
        }
    },
};
