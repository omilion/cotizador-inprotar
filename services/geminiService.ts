
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractionResult } from "../types";
import { extractProductInfoWithGroq } from "./groqService";

export const extractProductInfo = async (imageBase64: string, mimeType: string = 'image/jpeg'): Promise<ExtractionResult> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined);
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // actually flash 2.0 but named somewhat differently in some SDKs, keep existing if working
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: imageBase64.split(',')[1] || imageBase64,
            },
          },
          {
            text: `ACT AS A DATA EXTRACTION ENGINE. DO NOT INVENT TEXT.
              Analyze this document or image from Inprotar (electrical/industrial supplies).
              
              CRITICAL RULES:
              1. EXTRACTION MUST BE EXACT: Copy technical specifications VERBATIM from the document. Do not "interpret" or "improve" descriptions.
              2. EXHAUSTIVENESS: You must extract EVERY SINGLE ITEM listed in the table or list. If there are 50 items, extract 50 items.
              3. NO HALLUCINATIONS: If a value is missing, leave it empty or null. DO NOT INVENT DATA.
              4. NAME: Keep it SHORT (Model/Code only). Example: "Cable SHD-GC 5kV".
              5. DESCRIPTION: Combine all other details (Type, Specs, Dimensions) into a single string.
              6. BRAND: Always "INPROTAR" unless another brand is explicitly visible.
              7. CATEGORY: Classify based on the item (Cables, Control, Lighting, etc).
              
              Return strictly JSON.`
          }
        ],
      },
      config: {
        temperature: 0, // CRITICAL: Zero creativity to prevent hallucinations
        topK: 40,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            multipleModelsFound: { type: Type.BOOLEAN },
            products: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  brand: { type: Type.STRING },
                  description: { type: Type.STRING },
                  suggestedUnit: { type: Type.STRING, enum: ['u', 'm', 'kg', 'cm'] },
                  specDetails: { type: Type.STRING },
                  category: { type: Type.STRING }
                },
                required: ["name", "brand", "description", "suggestedUnit"]
              }
            }
          },
          required: ["multipleModelsFound", "products"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response text from Gemini");

    return JSON.parse(text.trim()) as ExtractionResult;

  } catch (error) {
    console.warn("⚠️ Gemini API failed, switching to Groq Fallback...", error);
    try {
      // FALLBACK TO GROQ
      return await extractProductInfoWithGroq(imageBase64, mimeType);
    } catch (groqError) {
      console.error("❌ Both Gemini and Groq failed:", groqError);
      throw new Error("Error procesando documento con ambos servicios de IA.");
    }
  }
};
