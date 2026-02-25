import { getDB } from "../../utils/db.js";
import { replyEmbed } from "../../utils/embeds.js";

// Custom Linear Regression: y = mx + b
function linearRegression(points) {
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = points.length;
    if (n === 0) return { m: 0, b: 0 };
    for (const [x, y] of points) {
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
    }
    const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) || 0;
    const b = (sumY - m * sumX) / n;
    return { m, b };
}

export default {
    name: "hot-time",
    description: "Forecast High Activity windows for the next 24 hours",
    async execute(message, args) {
        const db = await getDB();

        // Let's get timestamps for the last 7 days
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const rows = await db.all("SELECT timestamp FROM activity_logs WHERE timestamp > ?", sevenDaysAgo);

        if (rows.length === 0) {
            return replyEmbed(message, {
                type: "error",
                title: "📊 Not Enough Data",
                description: "Cannot forecast activity yet. Need more messages logged in the database."
            });
        }

        // Group by hour (0-23) across the last 7 days for regression
        const hourCounts = {};
        for (let i = 0; i < 24; i++) {
            hourCounts[i] = [0, 0, 0, 0, 0, 0, 0];
        }

        for (const row of rows) {
            const date = new Date(row.timestamp);
            const hour = date.getHours();
            const daysAgo = Math.floor((Date.now() - row.timestamp) / (24 * 60 * 60 * 1000));
            if (daysAgo >= 0 && daysAgo < 7) {
                hourCounts[hour][6 - daysAgo]++;
            }
        }

        let maxPred = 0;
        const predicted = [];

        // Now forecast each hour for "today" (day 7) using linear regression
        for (let h = 0; h < 24; h++) {
            const pts = [];
            for (let d = 0; d < 7; d++) {
                pts.push([d, hourCounts[h][d]]);
            }
            const { m, b } = linearRegression(pts);
            let pred = m * 7 + b;
            if (pred < 0) pred = 0;
            predicted.push({ hour: h, val: pred });
            if (pred > maxPred) maxPred = pred;
        }

        if (maxPred === 0) maxPred = 1; // avoid divide by zero

        let asciiChart = "```text\nPredicted Activity Heatmap (Next 24h)\n-------------------------------------\n";
        for (const p of predicted) {
            const barLen = Math.round((p.val / maxPred) * 20);
            const bar = "█".repeat(barLen).padEnd(20, " ");
            const hrStr = p.hour.toString().padStart(2, "0") + ":00";
            asciiChart += `${hrStr} | ${bar} | ~${Math.round(p.val)} msgs\n`;
        }
        asciiChart += "```";

        await message.channel.send({
            embeds: [{
                title: "📉 Server Activity Forecast",
                description: "Based on linear regression of the last 7 days, here is the predicted message volume per hour:\n\n" + asciiChart,
                color: 0x57F287
            }]
        });
    }
};
