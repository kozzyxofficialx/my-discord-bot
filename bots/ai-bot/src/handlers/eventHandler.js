import { readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async function (client) {
    const eventPath = join(__dirname, "../events");
    console.log(`[Loader] Reading events from: ${eventPath}`);

    const eventFiles = readdirSync(eventPath).filter(file => file.endsWith(".js"));
    console.log(`[Loader] Found ${eventFiles.length} event files.`);

    for (const file of eventFiles) {
        try {
            console.log(`[Loader] Loading event file: ${file}`);
            const eventModule = await import(pathToFileURL(join(eventPath, file)).href);
            const event = eventModule.default;

            if (event?.name) {
                if (event.once) {
                    client.once(event.name, (...args) => {
                        console.log(`[Event] Triggered ONCE: ${event.name}`);
                        event.execute(...args, client);
                    });
                } else {
                    client.on(event.name, (...args) => {
                        console.log(`[Event] Triggered: ${event.name}`);
                        event.execute(...args, client);
                    });
                }
                console.log(`[Loader] ✅ Registered Event: ${event.name}`);
            } else {
                console.warn(`[Loader] ⚠️ Event file ${file} missing 'name' property.`);
            }
        } catch (e) {
            console.error(`[Loader] ❌ Error loading event ${file}:`, e);
        }
    }
}
