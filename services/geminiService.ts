
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
            text: `SYSTEM ROLE: You are a rigorous Data Extraction Engine.
              TASK: Extract product line items from this document (Quote/Invoice/Spec Sheet).
              
              CRITICAL INSTRUCTIONS:
              1. **IDENTIFY THE MAIN PRODUCT TABLE**: Look for a table with columns like "Item", "Cant", "Descripción", "Precio", etc.
              2. **ROW-BY-ROW EXTRACTION**: Extract EVERY single row in that table as a separate product. Do not skip any rows.
              3. **COMPREHENSIVE EXTRACTION**: Extract ALL technical details found in the row. Do not leave anything out. If specs are in multiple columns, combine them.
              5. **BRAND**: Always "INPROTAR".
              6. **DESCRIPTION FORMAT**:
                 The description MUST follow this EXACT pattern:
                 "{Product Type} Marca INPROTAR {Technical Specs}"
                 
                 Example: "Cable Minero Marca INPROTAR 3x50mm2 SHD-GC 15kV Jacket TPU Reforzado"
                 
                 - {Product Type}: Use the generic name (e.g., Cable, Conector, Luminaria).
                 - {Technical Specs}: INCLUDE ALL DETAILS: Voltage, Dimensions, Materials, Colors, IP Ratings, Cat codes. 
                   **IMPORTANT**: Make the description rich and complete. Do not truncate.
              
              7. **NAME**: Keep it SHORT (Model/Code only). Example: "SHD-GC".
              
              OUTPUT FORMAT: JSON only.`
          }
        ],
      },
      config: {
        temperature: 0,
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
      }
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
