import { safeRespond } from "../../utils/helpers.js";
import { asEmbedPayload } from "../../utils/embeds.js";

export default {
    data: {
        name: "define", description: "Define an English word", options: [
            { name: "word", description: "Word to define", type: 3, required: true }
        ]
    },
    async execute(i) {
        const word = i.options?.getString?.("word");
        if (!word) {
            return safeRespond(i, asEmbedPayload({ guildId: i.guild?.id, type: "error", title: "❌ Missing Word", description: "Provide a word to define.", ephemeral: true }));
        }

        try {
            const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
            const data = await res.json();

            if (!Array.isArray(data) || !data[0]) throw new Error("No data");
            const entry = data[0];
            const meanings = entry.meanings || [];
            const first = meanings[0];
            const defs = first?.definitions || [];
            const defText = defs[0]?.definition || "No definition found.";

            const fields = [];
            if (first?.partOfSpeech) fields.push({ name: "Part of speech", value: first.partOfSpeech, inline: true });
            if (defs[0]?.example) fields.push({ name: "Example", value: String(defs[0].example).slice(0, 1024), inline: false });

            return safeRespond(
                i,
                asEmbedPayload({
                    guildId: i.guild?.id,
                    type: "info",
                    title: `📖 Definition: ${word}`,
                    description: String(defText).slice(0, 3000),
                    fields,
                })
            );
        } catch {
            return safeRespond(
                i,
                asEmbedPayload({
                    guildId: i.guild?.id,
                    type: "error",
                    title: "❌ Not Found",
                    description: `I couldn’t find a definition for **${word}**.`,
                    ephemeral: true,
                })
            );
        }
    }
};
