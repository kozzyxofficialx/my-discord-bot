import { PermissionsBitField } from "discord.js";
import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { unlockGuild } from "../../utils/raidProtection.js";

export default {
    data: {
        name: "unraid",
        description: "Lift a raid lockdown and unlock the server.",
        default_member_permissions: String(PermissionsBitField.Flags.Administrator),
        dm_permission: false,
    },
    async execute(interaction) {
        await unlockGuild(interaction.guild);
        return safeRespond(interaction, asEmbedPayload({ guildId: interaction.guildId, type: "success", title: "✅ Lockdown Lifted", description: "The server has been unlocked. @everyone can send messages again." }));
    },
};
