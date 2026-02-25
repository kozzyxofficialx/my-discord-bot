import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "src", "utils", "personality_weights.json");

// Default initial weights
let currentWeights = {
    sarcasm_level: 5.0,
    verbosity: 5.0,
    emoji_density: 5.0
};

export function loadWeights() {
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(currentWeights, null, 2));
        } else {
            const data = fs.readFileSync(filePath, "utf-8");
            currentWeights = { ...currentWeights, ...JSON.parse(data) };
        }
    } catch (err) {
        console.error("Error loading personality weights:", err);
    }
    return currentWeights;
}

export function saveWeights() {
    try {
        fs.writeFileSync(filePath, JSON.stringify(currentWeights, null, 2));
    } catch (err) {
        console.error("Error saving personality weights:", err);
    }
}

export function adjustWeight(variable, amount) {
    if (typeof currentWeights[variable] !== "undefined") {
        currentWeights[variable] += amount;
        // Keep within 1-10 bounds for sane prompting
        if (currentWeights[variable] > 10) currentWeights[variable] = 10;
        if (currentWeights[variable] < 0) currentWeights[variable] = 0;
        saveWeights();
    }
}

export function getPersonalityPrompt() {
    loadWeights(); // Always make sure it's fresh
    return `
=== AI PERSONALITY INSTRUCTIONS ===
You are KozzyX. Adhere to the following genetic personality weights (scale 0 to 10):
- Sarcasm Level: ${currentWeights.sarcasm_level.toFixed(1)}/10
- Verbosity (Response length): ${currentWeights.verbosity.toFixed(1)}/10 
- Emoji Density: ${currentWeights.emoji_density.toFixed(1)}/10
===================================
`;
}
