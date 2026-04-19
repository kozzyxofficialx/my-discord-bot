// Manual guild-specific deploy script for instant updates
import "dotenv/config";
import { REST, Routes } from "discord.js";
import { readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

// Error Handling: Check if GUILD_ID is missing
if (!guildId) {
    console.error("❌ Error: GUILD_ID is missing from the .env file. Please add it to deploy commands to a specific guild.");
    process.exit(1);
}

const commands = [];

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

const slashFiles = getAllFiles(join(__dirname, "slashCommands"));

for (const file of slashFiles) {
    const command = await import(pathToFileURL(file).href);
    if (command.default?.data) {
        commands.push(command.default.data);
    }
}

const rest = new REST({ version: "10" }).setToken(token);

try {
    console.log(`Started refreshing ${commands.length} GUILD application (/) commands.`);

    // Guild-specific deploy (instant)
    await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands },
    );

    console.log(`Successfully reloaded ${commands.length} GUILD application (/) commands.`);
} catch (error) {
    console.error(error);
}
