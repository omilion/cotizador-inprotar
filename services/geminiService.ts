
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractionResult } from "../types";

export const extractProductInfo = async (imageBase64: string, mimeType: string = 'image/jpeg'): Promise<ExtractionResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBase64.split(',')[1] || imageBase64,
          },
        },
        {
          text: `Analiza este material de Inprotar (eléctrico/industrial).
          1. Detecta productos o variantes técnicas.
          2. Extrae: Nombre comercial, Marca (si es distinta a Inprotar), y una "Mini Descripción" técnica MUY concisa de máximo 15 palabras.
          3. Unidad sugerida: 'u' (unidades/piezas), 'm' (metros), 'kg' (kilos).
          4. En 'specDetails' pon el dato clave diferenciador (ej: '32 Amperes', '50 Watts', '2x1.5mm').
          
          IMPORTANTE: La descripción debe ser técnica y orientada a ingeniería eléctrica.
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
                specDetails: { type: Type.STRING }
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

  try {
    return JSON.parse(text.trim()) as ExtractionResult;
  } catch (error) {
    console.error("Error parsing Gemini response:", error);
    throw new Error("Error procesando documento.");
  }
};
