
import { ExtractionResult } from "../types";

const GROQ_API_URL = "https://api.mistral.ai/v1/chat/completions"; // Using Mistral as Fallback

export const extractProductInfoWithGroq = async (imageBase64: string, mimeType: string = 'image/jpeg'): Promise<ExtractionResult> => {
    // We reuse the existing VITE_GROQ_API_KEY variable so you don't have to change code everywhere, 
    // BUT the value in Vercel/env must be your MISTRAL API KEY.
    const apiKey = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_MISTRAL_API_KEY;

    if (!apiKey) {
        console.error("Mistral API Key missing");
        throw new Error("Mistral API Key missing");
    }

    // Ensure base64 header is present for Mistral if needed, or just data.
    // Mistral Pixtral expects standard OpenAI format with data URLs.
    const dataUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:${mimeType};base64,${imageBase64}`;

    const prompt = `
    Analiza este documento o imagen de Inprotar. 
    Tu objetivo es extraer ABSOLUTAMENTE TODOS los productos listados.
    
    REGLAS:
    1. MARCA: Siempre "INPROTAR".
    2. NOMBRE: Corto y preciso.
    3. DESCRIPCIÓN: Detalle técnico completo.
    4. CATEGORÍA: Clasifica el producto.
    
    Responde SOLAMENTE con un JSON válido con esta estructura:
    {
      "multipleModelsFound": boolean,
      "products": [
        { "name": string, "brand": "INPROTAR", "description": string, "suggestedUnit": "u", "specDetails": string, "category": string }
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
                model: "pixtral-12b-2409", // Mistral's Vision Model
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
                max_tokens: 4096
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Mistral API Error: ${err}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) throw new Error("No content from Mistral");

        // Clean content if it has markdown code blocks
        const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleanContent) as ExtractionResult;

    } catch (error) {
        console.error("Error in Mistral extraction:", error);
        throw error;
    }
};
