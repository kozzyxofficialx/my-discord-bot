import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";
import { getDB } from "../../utils/db.js";

export default {
    data: {
        name: "todo",
        description: "Manage your simple to-do list",
        integration_types: [0, 1],
        contexts: [0, 1, 2],
        options: [
            {
                name: "add",
                description: "Add an item",
                type: 1, // Subcommand
                options: [{ name: "item", description: "Task description", type: 3, required: true }]
            },
            {
                name: "list",
                description: "List your items",
                type: 1
            },
            {
                name: "remove",
                description: "Remove an item by ID",
                type: 1,
                options: [{ name: "id", description: "Task ID (from list)", type: 4, required: true }]
            },
            {
                name: "clear",
                description: "Clear all your items",
                type: 1
            }
        ]
    },
    async execute(i) {
        const sub = i.options.getSubcommand();
        const db = await getDB();
        const userId = i.user.id;

        if (sub === "add") {
            const item = i.options.getString("item");
            await db.run("INSERT INTO todos (user_id, item, created_at) VALUES (?, ?, ?)", userId, item, Date.now());
            return safeRespond(i, { content: `✅ Added to your list: **${item}**`, ephemeral: true });
        }

        if (sub === "list") {
            const rows = await db.all("SELECT id, item FROM todos WHERE user_id = ?", userId);
            if (!rows.length) {
                return safeRespond(i, { content: "Your to-do list is empty.", ephemeral: true });
            }
            const list = rows.map(r => `\`${r.id}\` • ${r.item}`).join("\n");
            return safeRespond(i, asEmbedPayload({
                guildId: i.guild?.id,
                type: "info",
                title: "📝 Your To-Do List",
                description: list,
                footerUser: i.user,
                client: i.client,
            }));
        }

        if (sub === "remove") {
            const id = i.options.getInteger("id");
            const res = await db.run("DELETE FROM todos WHERE id = ? AND user_id = ?", id, userId);
            if (res.changes > 0) {
                return safeRespond(i, { content: `✅ Removed item #${id}.`, ephemeral: true });
            } else {
                return safeRespond(i, { content: `❌ Item #${id} not found or not yours.`, ephemeral: true });
            }
        }

        if (sub === "clear") {
            await db.run("DELETE FROM todos WHERE user_id = ?", userId);
            return safeRespond(i, { content: "✅ Cleared your to-do list.", ephemeral: true });
        }
    }
};
