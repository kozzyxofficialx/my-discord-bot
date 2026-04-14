import { boosterRolesDB, saveBoosterRoles, getGuildSettings } from "../../utils/database.js";
import { replyEmbed } from "../../utils/embeds.js";

export default {
    name: "boosterrole",
    async execute(message, args) {
        if (getGuildSettings(message.guild.id).plugins?.booster_roles === false) {
            return replyEmbed(message, { type: "error", title: "🚫 Feature Disabled", description: "The booster role system is disabled in this server." });
        }
        const sub = (args[0] || "").toLowerCase();
        const isBooster = message.member.roles.cache.some(r => r.tags?.premiumSubscriber);
        const isOwner = message.guild.ownerId === message.author.id;
        if (!isBooster && !isOwner) return replyEmbed(message, { type: "error", title: "🚀 Booster Only", description: "Only **Server Boosters** can use this." });

        if (sub === "create") {
            const name = args.slice(1).join(" ");
            if (!name) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "`,boosterrole create <name>`" });
            const oldId = boosterRolesDB.get(message.author.id);
            if (oldId) { const old = message.guild.roles.cache.get(oldId); if (old) await old.delete().catch(() => {}); }
            const role = await message.guild.roles.create({ name, color: "#a64dff" });
            await message.member.roles.add(role.id);
            boosterRolesDB.set(message.author.id, role.id);
            await saveBoosterRoles();
            return replyEmbed(message, { type: "success", title: "💎 Booster Role Created", description: `Created role **${name}** and assigned it to you.` });
        }

        if (sub === "color") {
            const hex = args[1];
            if (!hex) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "`,boosterrole color #ff55ff`" });
            const roleId = boosterRolesDB.get(message.author.id);
            if (!roleId) return replyEmbed(message, { type: "error", title: "❌ Not Found", description: "You don't have a booster role yet. Use `,boosterrole create <name>`" });
            const role = message.guild.roles.cache.get(roleId);
            if (!role) return replyEmbed(message, { type: "error", title: "❌ Missing Role", description: "Your booster role no longer exists. Create a new one." });
            await role.setColor(hex);
            return replyEmbed(message, { type: "success", title: "🎨 Color Updated", description: `Updated your booster role color to **${hex}**.` });
        }

        return replyEmbed(message, { type: "error", title: "❌ Usage", description: "`,boosterrole create <name>`\n`,boosterrole color <hex>`" });
    }
};
