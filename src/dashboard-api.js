import http from 'http';
import fs from 'fs';
import path from 'path';
import { URL, fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3456;
const AUTH_KEY = 'Balazs9849';
const REDIRECT_URI = 'https://kozzyx.bazsi9849.workers.dev/dashboard';

// In-memory data
let botLogs = [];
const MAX_LOGS = 100;
let botStats = {
    members: 0,
    commandsRan: 0,
    uptime: Date.now(),
    guilds: 0,
    shards: 1
};

const sessions = new Map();

export function initAPI(client) {
    const server = http.createServer(async (req, res) => {
        // ULTIMATE CORS HEADERS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Authorization, Origin, Accept');
        res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours cache

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
        const pathname = parsedUrl.pathname;

        // --- STATIC FILE SERVING ---
        if (pathname === '/dashboard.html' || pathname === '/dashboard' || pathname === '/') {
            const filePath = path.join(__dirname, '../website/dashboard.html');
            if (fs.existsSync(filePath)) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(fs.readFileSync(filePath));
                return;
            }
        }

        // --- AUTH ENDPOINTS ---
        if (pathname === '/api/auth/login' && req.method === 'GET') {
            const url = `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ url }));
            return;
        }

        if (pathname === '/api/auth/callback' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
                try {
                    const { code } = JSON.parse(body);
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

                    // ADMIN CHECK
                    const guild = client.guilds.cache.get(process.env.GUILD_ID);
                    const member = guild ? await guild.members.fetch(userData.id).catch(() => null) : null;
                    const isAdmin = member && member.permissions.has('Administrator');

                    if (!isAdmin && userData.id !== 'YOUR_ID_HERE') {
                        res.writeHead(403, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Access Denied' }));
                        return;
                    }

                    const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
                    sessions.set(sessionToken, userData);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ token: sessionToken, user: userData }));
                } catch (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message }));
                }
            });
            return;
        }

        // --- PROTECTED API ENDPOINTS ---
        const authHeader = req.headers['authorization'];
        const sessionToken = authHeader ? authHeader.split(' ')[1] : null;
        const apiKey = req.headers['x-api-key'];

        if (!sessions.has(sessionToken) && apiKey !== AUTH_KEY) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

        if (pathname === '/api/stats' && req.method === 'GET') {
            const data = {
                ...botStats,
                uptime: Math.floor((Date.now() - botStats.uptime) / 1000),
                members: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
                guilds: client.guilds.cache.size,
                online: client.ws.status === 0,
                guildName: client.guilds.cache.get(process.env.GUILD_ID)?.name || "Kozzy's Lair",
                guildMembers: client.guilds.cache.get(process.env.GUILD_ID)?.memberCount || 0
            };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        } 
        else if (pathname === '/api/logs' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(botLogs));
        }
        else if (pathname === '/api/message' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', async () => {
                try {
                    const { channelId, content } = JSON.parse(body);
                    const channel = await client.channels.fetch(channelId);
                    if (channel) {
                        await channel.send(content);
                        addLog('OK', `Message sent to #${channel.name}`);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    } else {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Channel not found' }));
                    }
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message }));
                }
            });
        }
        else {
            res.writeHead(404);
            res.end();
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
}

export function addLog(level, msg) {
    const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    botLogs.push({ time, level, msg });
    if (botLogs.length > MAX_LOGS) botLogs.shift();
}
