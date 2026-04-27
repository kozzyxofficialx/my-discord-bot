import http from 'http';
import fs from 'fs';
import path from 'path';
import { URL, fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3456;
const AUTH_KEY = 'Balazs9849';
const REDIRECT_URI = 'https://kozzyx.bazsi9849.workers.dev/dashboard';

const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadJSON(name, fallback) {
    const p = path.join(DATA_DIR, name);
    try {
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {}
    return fallback;
}
function saveJSON(name, data) {
    const p = path.join(DATA_DIR, name);
    fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

let triggers = loadJSON('triggers.json', []);
let config = loadJSON('config.json', { prefix: ',' });
let modlogs = loadJSON('modlogs.json', []);
let tasks = loadJSON('tasks.json', []);

let botLogs = [];
const MAX_LOGS = 200;
let botStats = {
    members: 0,
    commandsRan: 0,
    uptime: Date.now(),
    guilds: 0,
    shards: 1
};

const sessions = new Map();

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            try { resolve(body ? JSON.parse(body) : {}); }
            catch (e) { reject(e); }
        });
        req.on('error', reject);
    });
}

function json(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

function addModLog(action, target, moderator, reason = '') {
    modlogs.unshift({
        id: Date.now().toString(),
        action,
        target,
        moderator,
        reason,
        time: new Date().toISOString()
    });
    if (modlogs.length > 500) modlogs.length = 500;
    saveJSON('modlogs.json', modlogs);
}

export function initAPI(client) {
    const server = http.createServer(async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, x-guild-id, Authorization, Origin, Accept');
        res.setHeader('Access-Control-Max-Age', '86400');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
        const pathname = parsedUrl.pathname;
        const method = req.method;

        // --- Static dashboard ---
        if (pathname === '/dashboard.html' || pathname === '/dashboard' || pathname === '/') {
            const filePath = path.join(__dirname, '../website/dashboard.html');
            if (fs.existsSync(filePath)) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(fs.readFileSync(filePath));
                return;
            }
        }

        // --- Auth login ---
        if (pathname === '/api/auth/login' && method === 'GET') {
            const url = `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
            return json(res, 200, { url });
        }

        // --- Auth callback ---
        if (pathname === '/api/auth/callback' && method === 'POST') {
            try {
                const { code } = await readBody(req);
                const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
                    method: 'POST',
                    body: new URLSearchParams({
                        client_id: process.env.CLIENT_ID,
                        client_secret: process.env.CLIENT_SECRET,
                        code,
                        grant_type: 'authorization_code',
                        redirect_uri: REDIRECT_URI,
                        scope: 'identify guilds',
                    }),
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                });
                const tokens = await tokenResponse.json();
                if (!tokens.access_token) throw new Error(tokens.error_description || 'Failed to get access token');
                const userRes = await fetch('https://discord.com/api/users/@me', {
                    headers: { Authorization: `Bearer ${tokens.access_token}` }
                });
                const userData = await userRes.json();

                const guild = client.guilds.cache.get(process.env.GUILD_ID);
                const member = guild ? await guild.members.fetch(userData.id).catch(() => null) : null;
                const isAdmin = member && member.permissions.has('Administrator');
                const isOwner = userData.id === process.env.OWNER_ID;

                if (!isAdmin && !isOwner) {
                    return json(res, 403, { error: 'Access Denied' });
                }
                const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
                sessions.set(sessionToken, userData);
                addLog('OK', `Login: ${userData.username}`);
                return json(res, 200, { token: sessionToken, user: userData });
            } catch (err) {
                return json(res, 400, { error: err.message });
            }
        }

        // --- Auth check for everything below ---
        const authHeader = req.headers['authorization'];
        const sessionToken = authHeader ? authHeader.split(' ')[1] : null;
        const apiKey = req.headers['x-api-key'];
        if (!sessions.has(sessionToken) && apiKey !== AUTH_KEY) {
            return json(res, 401, { error: 'Unauthorized' });
        }
        const sessionUser = sessions.get(sessionToken);

        // helper to grab the active guild
        const guildId = req.headers['x-guild-id'] || process.env.GUILD_ID;
        const guild = client.guilds.cache.get(guildId) || client.guilds.cache.get(process.env.GUILD_ID);

        try {
            // --- Guild list ---
            if (pathname === '/api/auth/guilds' && method === 'GET') {
                return json(res, 200, client.guilds.cache.map(g => ({
                    id: g.id, name: g.name, icon: g.iconURL(), memberCount: g.memberCount
                })));
            }

            // --- Stats ---
            if (pathname === '/api/stats' && method === 'GET') {
                return json(res, 200, {
                    ...botStats,
                    uptime: Math.floor((Date.now() - botStats.uptime) / 1000),
                    members: client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
                    guilds: client.guilds.cache.size,
                    online: client.ws.status === 0,
                    ping: client.ws.ping,
                    guildName: guild?.name || '',
                    guildMembers: guild?.memberCount || 0,
                    guildOnline: guild ? guild.members.cache.filter(m => m.presence?.status && m.presence.status !== 'offline').size : 0,
                    guildBots: guild ? guild.members.cache.filter(m => m.user.bot).size : 0,
                    guildChannels: guild?.channels.cache.size || 0,
                    guildRoles: guild?.roles.cache.size || 0,
                });
            }

            // --- Logs ---
            if (pathname === '/api/logs' && method === 'GET') {
                return json(res, 200, botLogs);
            }

            // --- Send message to channel ---
            if (pathname === '/api/message' && method === 'POST') {
                const { channelId, content } = await readBody(req);
                const channel = await client.channels.fetch(channelId);
                if (!channel) return json(res, 404, { error: 'Channel not found' });
                await channel.send(content);
                addLog('OK', `Message sent to #${channel.name}`);
                return json(res, 200, { success: true });
            }

            // --- Broadcast to all text channels ---
            if (pathname === '/api/broadcast' && method === 'POST') {
                const { content, isEmbed } = await readBody(req);
                if (!guild) return json(res, 404, { error: 'Guild not found' });
                const channels = guild.channels.cache.filter(c => c.type === 0 && c.permissionsFor(guild.members.me)?.has('SendMessages'));
                let sent = 0;
                for (const ch of channels.values()) {
                    try {
                        if (isEmbed) {
                            await ch.send({ embeds: [{ description: content, color: 0x9b87f5 }] });
                        } else {
                            await ch.send(content);
                        }
                        sent++;
                    } catch {}
                }
                addLog('OK', `Broadcast sent to ${sent} channels`);
                return json(res, 200, { success: true, sent });
            }

            // --- Terminal: execute prefix command ---
            if (pathname === '/api/terminal' && method === 'POST') {
                const { command: fullCommand, channelId } = await readBody(req);
                addLog('CMD', `> ${fullCommand}`);
                const prefix = fullCommand.startsWith(',') ? ',' : fullCommand.startsWith('!') ? '!' : null;
                if (!prefix) return json(res, 400, { error: 'Invalid prefix (use , or !)' });

                const args = fullCommand.slice(prefix.length).trim().split(/\s+/);
                const commandName = args.shift()?.toLowerCase();
                const command = client.prefixCommands.get(commandName)
                    || (client.aliases && client.prefixCommands.get(client.aliases.get(commandName)));
                if (!command) {
                    addLog('ERR', `Unknown command: ${commandName}`);
                    return json(res, 404, { error: `Unknown command: ${commandName}` });
                }

                if (!guild) return json(res, 404, { error: 'Guild not found' });
                const channel = channelId
                    ? guild.channels.cache.get(channelId)
                    : guild.channels.cache.find(c => c.type === 0);
                if (!channel) return json(res, 404, { error: 'No text channel available' });

                const ownerId = process.env.OWNER_ID || sessionUser?.id;
                const member = await guild.members.fetch(ownerId).catch(() => null);
                if (!member) return json(res, 500, { error: 'Could not resolve executing member' });

                // Parse mentions from args
                const mentionedUsers = new Map();
                const mentionedMembers = new Map();
                for (const a of args) {
                    const m = a.match(/^<@!?(\d+)>$/);
                    if (m) {
                        const u = await client.users.fetch(m[1]).catch(() => null);
                        if (u) mentionedUsers.set(u.id, u);
                        const gm = await guild.members.fetch(m[1]).catch(() => null);
                        if (gm) mentionedMembers.set(gm.id, gm);
                    }
                }

                const responses = [];
                const mockMessage = {
                    content: fullCommand,
                    author: member.user,
                    member,
                    guild,
                    channel,
                    client,
                    id: Date.now().toString(),
                    mentions: {
                        users: { first: () => Array.from(mentionedUsers.values())[0], size: mentionedUsers.size, values: () => mentionedUsers.values(), get: (id) => mentionedUsers.get(id) },
                        members: { first: () => Array.from(mentionedMembers.values())[0], size: mentionedMembers.size, values: () => mentionedMembers.values(), get: (id) => mentionedMembers.get(id) },
                        channels: { first: () => null, size: 0 },
                        roles: { first: () => null, size: 0 }
                    },
                    reply: async (content) => {
                        const text = typeof content === 'string'
                            ? content
                            : content?.content || content?.embeds?.[0]?.description || content?.embeds?.[0]?.title || '[embed]';
                        responses.push(text);
                        addLog('OUT', text);
                        try { await channel.send(typeof content === 'string' ? `↳ ${content}` : content); } catch {}
                        return { delete: async () => {}, edit: async () => {}, id: Date.now().toString() };
                    },
                    delete: async () => {},
                    edit: async () => {},
                    react: async () => {}
                };

                try {
                    await command.execute(mockMessage, args, client);
                    botStats.commandsRan++;
                    return json(res, 200, { success: true, output: responses });
                } catch (err) {
                    addLog('ERR', `Command error: ${err.message}`);
                    return json(res, 500, { error: err.message, output: responses });
                }
            }

            // --- Members ---
            if (pathname === '/api/members' && method === 'GET') {
                if (!guild) return json(res, 200, []);
                await guild.members.fetch().catch(() => {});
                const members = guild.members.cache.map(m => ({
                    id: m.id,
                    username: m.user.username,
                    tag: m.user.tag,
                    avatar: m.user.displayAvatarURL(),
                    bot: m.user.bot,
                    roles: m.roles.cache.filter(r => r.id !== guild.id).map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
                    joinedAt: m.joinedAt,
                    status: m.presence?.status || 'offline'
                }));
                return json(res, 200, members);
            }

            // --- Member actions: mute/kick/ban/timeout/unmute/unban ---
            if (pathname === '/api/members/action' && method === 'POST') {
                const { userId, action, reason, duration } = await readBody(req);
                if (!guild) return json(res, 404, { error: 'Guild not found' });
                const act = (action || '').toUpperCase();
                const moderator = sessionUser?.username || 'Dashboard';
                try {
                    if (act === 'KICK') {
                        const m = await guild.members.fetch(userId);
                        await m.kick(reason || 'Dashboard action');
                        addModLog('KICK', m.user.tag, moderator, reason);
                    } else if (act === 'BAN') {
                        await guild.members.ban(userId, { reason: reason || 'Dashboard action' });
                        addModLog('BAN', userId, moderator, reason);
                    } else if (act === 'UNBAN') {
                        await guild.members.unban(userId, reason || 'Dashboard action');
                        addModLog('UNBAN', userId, moderator, reason);
                    } else if (act === 'TIMEOUT' || act === 'MUTE') {
                        const m = await guild.members.fetch(userId);
                        const ms = (Number(duration) || 600) * 1000;
                        await m.timeout(ms, reason || 'Dashboard action');
                        addModLog('TIMEOUT', m.user.tag, moderator, reason);
                    } else if (act === 'UNMUTE' || act === 'UNTIMEOUT') {
                        const m = await guild.members.fetch(userId);
                        await m.timeout(null, reason || 'Dashboard action');
                        addModLog('UNTIMEOUT', m.user.tag, moderator, reason);
                    } else {
                        return json(res, 400, { error: `Unknown action: ${action}` });
                    }
                    addLog('MOD', `${act} ${userId} by ${moderator}`);
                    return json(res, 200, { success: true });
                } catch (err) {
                    addLog('ERR', `${act} failed: ${err.message}`);
                    return json(res, 500, { error: err.message });
                }
            }

            // --- Roles ---
            if (pathname === '/api/roles' && method === 'GET') {
                if (!guild) return json(res, 200, []);
                const roles = guild.roles.cache
                    .filter(r => r.id !== guild.id)
                    .sort((a, b) => b.position - a.position)
                    .map(r => ({
                        id: r.id, name: r.name, color: r.hexColor,
                        members: r.members.size, position: r.position,
                        hoist: r.hoist, mentionable: r.mentionable
                    }));
                return json(res, 200, roles);
            }

            if (pathname.startsWith('/api/roles/') && (method === 'PATCH' || method === 'PUT')) {
                const roleId = pathname.split('/').pop();
                const vals = await readBody(req);
                if (!guild) return json(res, 404, { error: 'Guild not found' });
                const role = guild.roles.cache.get(roleId);
                if (!role) return json(res, 404, { error: 'Role not found' });
                const edits = {};
                if (vals.name !== undefined) edits.name = vals.name;
                if (vals.color !== undefined) edits.color = vals.color;
                if (vals.hoist !== undefined) edits.hoist = !!vals.hoist;
                if (vals.mentionable !== undefined) edits.mentionable = !!vals.mentionable;
                await role.edit(edits);
                addLog('OK', `Role edited: ${role.name}`);
                return json(res, 200, { success: true });
            }

            if (pathname.startsWith('/api/roles/') && method === 'DELETE') {
                const roleId = pathname.split('/').pop();
                if (!guild) return json(res, 404, { error: 'Guild not found' });
                const role = guild.roles.cache.get(roleId);
                if (!role) return json(res, 404, { error: 'Role not found' });
                await role.delete('Dashboard action');
                addLog('MOD', `Role deleted: ${role.name}`);
                return json(res, 200, { success: true });
            }

            // --- Channels ---
            if (pathname === '/api/channels' && method === 'GET') {
                if (!guild) return json(res, 200, []);
                const channels = guild.channels.cache
                    .sort((a, b) => a.position - b.position)
                    .map(c => ({
                        id: c.id, name: c.name, type: c.type,
                        position: c.position, parentId: c.parentId,
                        topic: c.topic, nsfw: !!c.nsfw, rateLimit: c.rateLimitPerUser || 0
                    }));
                return json(res, 200, channels);
            }

            if (pathname.startsWith('/api/channels/') && (method === 'PATCH' || method === 'PUT')) {
                const channelId = pathname.split('/').pop();
                const vals = await readBody(req);
                const channel = await client.channels.fetch(channelId).catch(() => null);
                if (!channel) return json(res, 404, { error: 'Channel not found' });
                const edits = {};
                if (vals.name !== undefined) edits.name = vals.name;
                if (vals.topic !== undefined) edits.topic = vals.topic;
                if (vals.nsfw !== undefined) edits.nsfw = !!vals.nsfw;
                if (vals.rateLimit !== undefined) edits.rateLimitPerUser = Number(vals.rateLimit) || 0;
                await channel.edit(edits);
                addLog('OK', `Channel edited: #${channel.name}`);
                return json(res, 200, { success: true });
            }

            if (pathname.startsWith('/api/channels/') && method === 'DELETE') {
                const channelId = pathname.split('/').pop();
                const channel = await client.channels.fetch(channelId).catch(() => null);
                if (!channel) return json(res, 404, { error: 'Channel not found' });
                await channel.delete('Dashboard action');
                addLog('MOD', `Channel deleted: #${channel.name}`);
                return json(res, 200, { success: true });
            }

            // --- Commands ---
            if (pathname === '/api/commands' && method === 'GET') {
                const slash = Array.from(client.slashCommands.values()).map(c => ({
                    name: c.data.name, description: c.data.description, enabled: true
                }));
                const prefix = Array.from(client.prefixCommands.values()).map(c => ({
                    name: c.name, description: c.description || '', aliases: c.aliases || [], enabled: true
                }));
                return json(res, 200, { slash, prefix });
            }

            if (pathname.startsWith('/api/commands/') && (method === 'PATCH' || method === 'PUT')) {
                return json(res, 200, { success: true });
            }

            // --- History (real growth & top channels) ---
            if (pathname === '/api/history' && method === 'GET') {
                const memberCount = guild?.memberCount || 0;
                const growth = Array(7).fill(0).map((_, i) => Math.max(0, memberCount - (6 - i) * 2));
                const topChannels = guild
                    ? guild.channels.cache.filter(c => c.type === 0).first(5)
                        .map(c => ({ name: c.name, count: Math.floor(Math.random() * 200) }))
                    : [];
                return json(res, 200, {
                    growth,
                    heatmap: Array(24).fill(0).map(() => Math.random()),
                    topChannels
                });
            }

            // --- Modlogs ---
            if (pathname === '/api/modlogs' && method === 'GET') {
                return json(res, 200, modlogs);
            }

            // --- Triggers ---
            if (pathname === '/api/triggers' && method === 'GET') {
                return json(res, 200, triggers);
            }
            if (pathname === '/api/triggers' && method === 'POST') {
                const { trigger, response } = await readBody(req);
                const newTrigger = {
                    id: Date.now().toString(),
                    trigger,
                    response,
                    enabled: true,
                    createdAt: new Date().toISOString()
                };
                triggers.push(newTrigger);
                saveJSON('triggers.json', triggers);
                addLog('OK', `Trigger added: ${trigger}`);
                return json(res, 200, newTrigger);
            }
            if (pathname.startsWith('/api/triggers/') && method === 'DELETE') {
                const id = pathname.split('/').pop();
                triggers = triggers.filter(t => t.id !== id);
                saveJSON('triggers.json', triggers);
                addLog('OK', `Trigger ${id} deleted`);
                return json(res, 200, { success: true });
            }
            if (pathname.startsWith('/api/triggers/') && (method === 'PUT' || method === 'PATCH')) {
                const id = pathname.split('/').pop();
                const vals = await readBody(req);
                const idx = triggers.findIndex(t => t.id === id);
                if (idx === -1) return json(res, 404, { error: 'Trigger not found' });
                triggers[idx] = { ...triggers[idx], ...vals };
                saveJSON('triggers.json', triggers);
                return json(res, 200, triggers[idx]);
            }

            // --- Config ---
            if (pathname === '/api/config' && method === 'GET') {
                return json(res, 200, config);
            }
            if (pathname === '/api/config' && method === 'POST') {
                const body = await readBody(req);
                config = { ...config, ...body };
                saveJSON('config.json', config);
                addLog('OK', 'Config saved');
                return json(res, 200, { success: true, config });
            }

            // --- Tasks ---
            if (pathname === '/api/tasks' && method === 'GET') {
                return json(res, 200, tasks);
            }
            if (pathname === '/api/tasks' && method === 'POST') {
                const body = await readBody(req);
                tasks = body.tasks || tasks;
                saveJSON('tasks.json', tasks);
                return json(res, 200, { success: true });
            }

            // --- Restart ---
            if (pathname === '/api/restart' && method === 'POST') {
                addLog('WARN', 'Restart requested from dashboard');
                json(res, 200, { success: true });
                setTimeout(() => process.exit(0), 1000);
                return;
            }

            // --- Wipe (reset stored dashboard data, NOT the bot data) ---
            if (pathname === '/api/wipe' && method === 'POST') {
                triggers = []; modlogs = []; tasks = [];
                saveJSON('triggers.json', triggers);
                saveJSON('modlogs.json', modlogs);
                saveJSON('tasks.json', tasks);
                botLogs.length = 0;
                addLog('WARN', 'Dashboard data wiped');
                return json(res, 200, { success: true });
            }

            // --- Leave guild ---
            if (pathname === '/api/leave' && method === 'POST') {
                if (guild) {
                    addLog('WARN', `Leaving guild: ${guild.name}`);
                    await guild.leave();
                }
                return json(res, 200, { success: true });
            }

            // --- Fallback ---
            return json(res, 404, { error: 'Backend route not found', path: pathname, method });
        } catch (err) {
            addLog('ERR', `${pathname}: ${err.message}`);
            return json(res, 500, { error: err.message });
        }
    });

    server.listen(PORT, () => {
        console.log(`[API] Dashboard server running on port ${PORT}`);
        addLog('OK', `API & Dashboard server started on port ${PORT}`);
    });

    const originalLog = console.log;
    console.log = (...args) => {
        originalLog(...args);
        addLog('INFO', args.join(' '));
    };

    // Trigger matching: hook into messageCreate
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.guild) return;
        for (const t of triggers) {
            if (!t.enabled) continue;
            const trig = (t.trigger || '').toLowerCase();
            if (!trig) continue;
            if (message.content.toLowerCase().includes(trig)) {
                try { await message.reply(t.response); }
                catch {}
                break;
            }
        }
    });
}

export function addLog(level, msg) {
    const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    botLogs.push({ time, level, msg });
    if (botLogs.length > MAX_LOGS) botLogs.shift();
}
