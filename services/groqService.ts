
import { ExtractionResult } from "../types";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export const extractProductInfoWithGroq = async (imageBase64: string, mimeType: string = 'image/jpeg'): Promise<ExtractionResult> => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;

    if (!apiKey) {
        console.error("GROQ API Key missing");
        throw new Error("GROQ API Key missing");
    }

    // Ensure base64 header is present for Groq if needed, or just data.
    // OpenAI/Groq usually expects "data:image/jpeg;base64,{DATA}" or just the url if hosted.
    // Since we have raw base64 data (maybe with or without header from the reader), let's ensure it's a data URL.
    const dataUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:${mimeType};base64,${imageBase64}`;

    const prompt = `
    Analiza este documento o imagen de Inprotar (insumos eléctricos/industriales). 
    Tu objetivo es extraer ABSOLUTAMENTE TODOS los productos listados.
    
    REGLAS:
    1. MARCA: Siempre "INPROTAR".
    2. NOMBRE: Corto y preciso (Modelo/Código).
    3. DESCRIPCIÓN: Todo el detalle técnico.
    4. CATEGORÍA: Clasifica el producto.
    
    Responde SOLAMENTE con un JSON válido con esta estructura exacta, sin markdown ni explicaciones:
    {
      "multipleModelsFound": boolean,
      "products": [
        {
          "name": string,
          "brand": "INPROTAR",
          "description": string,
          "suggestedUnit": "u" | "m" | "kg",
          "specDetails": string,
          "category": string
        }
      ]
    }
    `;

    try {
        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llava-v1.5-7b-4096-preview",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            { type: "image_url", image_url: { url: dataUrl } }
                        ]
                    }
                ],
                temperature: 0.1,
                max_tokens: 4096,
                response_format: { type: "json_object" } // Force JSON
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Groq API Error: ${err}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) throw new Error("No content from Groq");

        return JSON.parse(content) as ExtractionResult;

    } catch (error) {
        console.error("Error in Groq extraction:", error);
        throw error;
    }
};
