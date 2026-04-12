import { readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to recursively get files
function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = readdirSync(dirPath);

    files.forEach(function (file) {
        const fullPath = join(dirPath, file);
        if (statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
            if (file.endsWith(".js")) arrayOfFiles.push(fullPath);
        }
    });

    return arrayOfFiles;
}

export default async function (client) {
    console.log("[CommandHandler] Starting to load commands...");

    // Clear existing to avoid stale data
    client.slashCommands.clear();
    client.slashData = [];

    const slashPath = join(__dirname, "../slashCommands");

    // Load Slash Commands
    const slashFiles = getAllFiles(slashPath);
    console.log(`[CommandHandler] Found ${slashFiles.length} slash command files.`);

    for (const file of slashFiles) {
        try {
            const cmd = await import(pathToFileURL(file).href);
            const command = cmd.default;
            if (command?.data?.name) {
                client.slashCommands.set(command.data.name, command);
                client.slashData.push(command.data);
                console.log(`[CommandHandler] ✅ Loaded Slash: ${command.data.name}`);
            } else {
                console.warn(`[CommandHandler] ⚠️ Skipped ${file} - Missing data.name`);
            }
        } catch (e) {
            console.error(`[CommandHandler] ❌ Error loading slash command ${file}:`, e);
        }
    }

    console.log(`[CommandHandler] Total Slash Commands Loaded: ${client.slashCommands.size}`);
    console.log(`[CommandHandler] Keys: ${[...client.slashCommands.keys()].join(", ")}`);
}
