import { Events, ChannelType } from "discord.js";
import { getGuildSettings } from "../utils/database.js";
import { getDB } from "../utils/db.js";

export default {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const guild = newState.guild ?? oldState.guild;
        if (!guild) return;

        const settings = getGuildSettings(guild.id);
        if (!settings.plugins?.dynamic_vc) return;

        const triggerChannelId = settings.dynamicVc?.triggerChannelId;
        if (!triggerChannelId) return;

        const db = await getDB();

        // User joined the trigger channel — create their VC
        if (newState.channelId === triggerChannelId && newState.member) {
            const member = newState.member;
            const categoryId = settings.dynamicVc?.categoryId ?? newState.channel?.parentId ?? null;
            const userLimit = settings.dynamicVc?.userLimit ?? 0;

            try {
                const vc = await guild.channels.create({
                    name: `${member.displayName}'s VC`,
                    type: ChannelType.GuildVoice,
                    parent: categoryId,
                    userLimit,
                    reason: "Dynamic VC — created on join",
                });

                await db.run(
                    "INSERT OR REPLACE INTO dynamic_vcs (channel_id, owner_id, guild_id, created_at) VALUES (?, ?, ?, ?)",
                    vc.id, member.id, guild.id, Date.now()
                );

                await member.voice.setChannel(vc).catch(() => null);
            } catch (err) {
                console.error("[dynamicVC] Failed to create VC:", err);
            }
        }

        // User left a dynamic VC — delete if empty
        if (oldState.channelId && oldState.channelId !== triggerChannelId) {
            const row = await db.get("SELECT owner_id FROM dynamic_vcs WHERE channel_id = ?", oldState.channelId);
            if (row) {
                const ch = guild.channels.cache.get(oldState.channelId);
                if (ch && ch.members.size === 0) {
                    await ch.delete("Dynamic VC — empty").catch(() => null);
                    await db.run("DELETE FROM dynamic_vcs WHERE channel_id = ?", oldState.channelId);
                }
            }
        }
    },
};
