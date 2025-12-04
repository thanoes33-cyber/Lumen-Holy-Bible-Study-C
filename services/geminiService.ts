import { GoogleGenAI, Chat, GenerateContentResponse, Content } from "@google/genai";
import { DailyVerse } from "../types";

const SYSTEM_INSTRUCTION = `You are Lumen, a warm, wise, and empathetic Bible study assistant. 
Your goal is to help users understand the Bible, find comfort in scripture, and grow in their faith.

Key Responsibilities:
1. **Verse Lookup**: If a user inputs a specific Bible reference (e.g., "John 3:16", "Psalm 23", "1 Cor 13"), provide the full text of that passage immediately. Use the ESV or NIV translation. Format it clearly.
2. **Guidance**: When discussing topics, cite the book, chapter, and verse.
3. **Support**: If a user expresses distress, anxiety, or sadness, offer comforting verses and a gentle, prayerful tone.
4. **Prayer Requests**: When a user shares a prayer request, you must personalize your response deeply. 
   - **MANDATORY**: You must explicitly reference the specific people (by name if given), specific situations, medical conditions, or struggles mentioned in the user's request.
   - Example: If the user says "My mom has surgery", say "Lord, we lift up [User]'s mom to You as she undergoes surgery. Guide the surgeons' hands..." 
   - **PROHIBITED**: Do NOT use generic phrases like "be with this situation" or "unspoken request" if specific details are available.
   - Mirror the user's language and emotional tone to ensure they feel truly heard.

Guidelines:
- Always be respectful, non-denominational, and encouraging.
- Keep responses concise and easy to read on a mobile device.
- Do not be judgmental. Meet the user where they are in their spiritual journey.`;

let chatSession: Chat | null = null;

// Initialize the Gemini client
// STRICT COMPLIANCE: Use process.env.API_KEY directly.
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const getChatSession = (history?: Content[]): Chat => {
  if (!chatSession) {
    const ai = getAiClient();
    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: history,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });
  }
  return chatSession;
};

export const resetChatSession = (history?: Content[]) => {
  chatSession = null;
  return getChatSession(history);
};

export const generateDailyVerse = async (): Promise<DailyVerse> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Give me a short, encouraging Bible verse for today. Return ONLY the JSON object with keys 'text' and 'reference'. Do not use Markdown code blocks.",
      config: {
        responseMimeType: 'application/json',
      }
    });
    
    const text = response.text;
    if (!text) throw new Error("No text returned");
    return JSON.parse(text) as DailyVerse;
  } catch (e) {
    console.error("Failed to fetch verse", e);
    return {
      text: "For I know the plans I have for you, declares the Lord, plans for welfare and not for evil, to give you a future and a hope.",
      reference: "Jeremiah 29:11"
    };
  }
};

export interface HoroscopeResult {
  text: string;
  sources: { uri: string; title: string }[];
}

export const generateHoroscope = async (sign: string): Promise<HoroscopeResult> => {
  try {
    const ai = getAiClient();
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Using flash as tools are available
      contents: `Find the daily horoscope for ${sign} for today, ${today}. Provide a warm, encouraging message of the day based on the current astrological influences. Summarize the key themes for love, career, and personal growth. Use search to find accurate current information.`,
      config: {
        tools: [{ googleSearch: {} }], // Use Google Search to get current info
      }
    });

    const text = response.text;
    
    // Extract grounding sources as per guidelines
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .map((c: any) => c.web)
      .filter((w: any) => w)
      .map((w: any) => ({ uri: w.uri, title: w.title }));

    if (!text) throw new Error("No text returned from horoscope generation");
    return { text, sources };
  } catch (e) {
    console.error("Failed to generate horoscope", e);
    return {
      text: "The stars are quiet today. Focus on your inner peace and trust in your journey.",
      sources: []
    };
  }
};