import { GoogleGenerativeAI } from "@google/generative-ai";
import { getPersonalityPrompt } from "./personality.js";

let genAI;

export function getGenAI() {
    if (!genAI) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("Missing GEMINI_API_KEY in .env");
        }
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    return genAI;
}

export async function askGemini(prompt, modelName = "gemini-2.0-flash-lite") {
    try {
        const ai = getGenAI();
        const model = ai.getGenerativeModel({ model: modelName });
        const systemPrompt = getPersonalityPrompt();
        const finalPrompt = systemPrompt + "\n" + prompt;

        const result = await model.generateContent(finalPrompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        const errorMsg = error.message || "";
        console.error("Gemini API Error:", errorMsg);

        if (errorMsg.includes("429") || errorMsg.includes("Quota exceeded") || errorMsg.includes("Too Many Requests")) {
            return "QUOTA_EXCEEDED";
        }

        return "ERROR";
    }
}
