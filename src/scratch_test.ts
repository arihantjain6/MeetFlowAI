import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function test() {
  console.log("Testing Gemini API Key:", process.env.GEMINI_API_KEY);
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello, are you working?",
    });
    console.log("Success! Response:", response.text);
  } catch (error) {
    console.error("Error testing Gemini API Key:", error);
  }
}

test();
