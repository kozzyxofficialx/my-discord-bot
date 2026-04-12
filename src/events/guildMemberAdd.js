import { Events } from "discord.js";
import { getGuildSettings, getUserCosmetics, setUserCosmetics } from "../utils/database.js";
import { resolveUsedInvite, recordJoin } from "../utils/inviteTracker.js";
import { checkRaid } from "../utils/raidProtection.js";

export default {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            // ── Invite tracking ─────────────────────────────────────────────
            const settings = getGuildSettings(member.guild.id);
            if (settings.plugins?.invite_tracking) {
                const { code, inviterId } = await resolveUsedInvite(member.guild);
                await recordJoin(member.guild.id, member.id, inviterId, code);
            }

            // ── Anti-raid check ─────────────────────────────────────────────
            const raided = await checkRaid(member);
            if (raided) return; // stop further processing during raid

            // ── Booster welcome ─────────────────────────────────────────────
            const isBooster = member.premiumSince || member.roles.cache.some((r) => r.tags?.premiumSubscriber);
            if (!isBooster) return;

            const cfg = settings.boosterWelcomeBonus || { enabled: true, title: "Server Booster" };
            if (!cfg.enabled) return;

            const title = String(cfg.title || "Server Booster");
            const cos = await getUserCosmetics(member.id);
            if (!cos.manualTitle) {
                await setUserCosmetics(member.id, { autoTitle: title });
            }

            try {
                await member.send(
                    `💜 Thanks for boosting **${member.guild.name}**!\nYou've received the title **${title}**!`
                );
            } catch { /* DM unavailable — user has DMs disabled */ }

        } catch (err) {
            console.error("GuildMemberAdd error:", err);
        }
    }
};
