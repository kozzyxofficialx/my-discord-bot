import http from 'http';
import { URL } from 'url';

const PORT = 3456;
const AUTH_KEY = 'Balazs9849';

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

export function initAPI(client) {
    const server = http.createServer((req, res) => {
        // CORS Headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
        const path = parsedUrl.pathname;

        // Simple Auth
        const apiKey = req.headers['x-api-key'];
        if (apiKey !== AUTH_KEY) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

        if (path === '/api/stats' && req.method === 'GET') {
            const data = {
                ...botStats,
                uptime: Math.floor((Date.now() - botStats.uptime) / 1000),
                members: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
                guilds: client.guilds.cache.size,
                online: client.ws.status === 0
            };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        } 
        else if (path === '/api/logs' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(botLogs));
        }
        else if (path === '/api/message' && req.method === 'POST') {
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
        console.log(`[API] Dashboard backend running on port ${PORT}`);
        addLog('OK', `API server started on port ${PORT}`);
    });

    // Hook into global console for logs (very basic)
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
