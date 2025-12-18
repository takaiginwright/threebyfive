import { GoogleGenAI, Type } from "@google/genai";
import { IdeaCard, CardCategory, ALL_CATEGORIES } from "../types";

// Helper to get client safely
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

export const generateBrainstorm = async (category: CardCategory, context?: string): Promise<string> => {
  try {
    const ai = getClient();
    const model = "gemini-2.5-flash"; 
    
    let prompt = `Generate a creative, cinematic, and unique idea for a story ${category}.`;
    if (context) {
      prompt += ` It should fit within this context: "${context}".`;
    }
    prompt += ` Keep it concise (under 50 words) but evocative.`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text?.trim() || "Could not generate idea.";
  } catch (error) {
    console.error("Gemini Brainstorm Error:", error);
    return "Error generating idea. Please check your API key.";
  }
};

export const autoTagCard = async (card: IdeaCard): Promise<Partial<Record<CardCategory, string[]>>> => {
  try {
    const ai = getClient();
    const model = "gemini-2.5-flash";

    if (!card.title && !card.content) return {};

    const prompt = `
      Analyze the following story idea and suggest concise tags for relevant categories. 
      Only return tags if they are strongly relevant.
      
      The Categories are: ${ALL_CATEGORIES.join(', ')}.
      
      IMPORTANT: formatting.
      For each tag, try to include a specific subcategory if possible, formatted as "Subcategory – TagName".
      Example: "Atmosphere – Foggy" or "Color – Amber" or "Beat – Inciting Incident".
      If no subcategory fits, just use the "TagName".

      Return JSON format where keys are the Categories and values are arrays of strings.

      Title: ${card.title}
      Content: ${card.content}
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            Setting: { type: Type.ARRAY, items: { type: Type.STRING } },
            Theme: { type: Type.ARRAY, items: { type: Type.STRING } },
            Character: { type: Type.ARRAY, items: { type: Type.STRING } },
            Visuals: { type: Type.ARRAY, items: { type: Type.STRING } },
            Mood: { type: Type.ARRAY, items: { type: Type.STRING } },
            Sound: { type: Type.ARRAY, items: { type: Type.STRING } },
            Plot: { type: Type.ARRAY, items: { type: Type.STRING } },
            Genre: { type: Type.ARRAY, items: { type: Type.STRING } },
            Other: { type: Type.ARRAY, items: { type: Type.STRING } },
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return {};
    
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Gemini Auto-Tag Error:", error);
    return {};
  }
};

export const expandIdea = async (title: string): Promise<string> => {
    try {
        const ai = getClient();
        const model = "gemini-2.5-flash";
        
        const prompt = `I have a title for a story idea: "${title}". Write a short paragraph (approx 50-80 words) expanding on this idea, describing the core conflict, imagery, or "vibe". Make it feel cinematic.`;
    
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });
    
        return response.text?.trim() || "";
    } catch (e) {
        console.error(e);
        return "";
    }
}