
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractionResult } from "../types";
import { extractProductInfoWithGroq } from "./groqService";

export const extractProductInfo = async (imageBase64: string, mimeType: string = 'image/jpeg'): Promise<ExtractionResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
            text: `Analiza este documento o imagen de Inprotar (insumos eléctricos/industriales). 
              Tu objetivo es extraer ABSOLUTAMENTE TODOS los productos listados, sin omitir ninguno.
              
              REGLAS CRÍTICAS DE EXTRACCIÓN:
              1. EXHAUSTIVIDAD: Si hay 10 ítems en el documento, debes extraer 10 productos. No resumas.
              2. MARCA: Siempre "INPROTAR".
              3. NOMBRE (IMPORTANTE): Debe ser CORTO y preciso. Solo Modelo o Código (ej. "Cable SHD-GC 5kV"). NO incluyas especificaciones aquí.
              4. DESCRIPCIÓN (IMPORTANTE): Aquí pon TODO el resto del texto. Formato: "{Tipo} Marca INPROTAR {Especificaciones completas}". Un solo párrafo.
              5. CATEGORÍA: Clasifica el producto (Cables, Control, Iluminación, etc).
              
              Responde estrictamente en JSON.`
          }
        ],
      },
      config: {
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
