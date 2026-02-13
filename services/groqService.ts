
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
    let dataUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:${mimeType};base64,${imageBase64}`;

    // SPECIAL HANDLING: If input is PDF, Convert Page 1 to Image for Mistral Fallback
    if (mimeType === 'application/pdf') {
        try {
            console.log("Converting PDF to Image for Mistral Fallback...");
            const base64Data = imageBase64.startsWith('data:') ? imageBase64.split(',')[1] : imageBase64;
            const binaryString = window.atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // @ts-ignore
            const pdf = await window.pdfjsLib.getDocument(bytes).promise;
            const page = await pdf.getPage(1); // Get first page for fallback

            const scale = 1.5;
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport }).promise;
            dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            console.log("PDF converted to Image successfully for fallback.");
        } catch (e) {
            console.error("Failed to convert PDF for fallback:", e);
            throw new Error("El PDF no se pudo convertir para el sistema de respaldo. Intenta subir una imagen.");
        }
    }

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

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
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

            if (response.status === 429) {
                attempts++;
                console.warn(`⚠️ Mistral Rate Limit (429). Retrying in ${attempts * 2}s...`);
                await new Promise(resolve => setTimeout(resolve, attempts * 2000));
                continue;
            }

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
            // If it's a critical error (not 429), throw immediately unless we want to retry on network errors too.
            // For simplicity, we throw non-429 errors or if retries exhausted.
            if (attempts >= maxAttempts - 1) throw error;
            // logic continues if catch block was purely network error? 
            // The fetch is inside try, so network error goes here. 
            // Let's decide: if network error, throw? or retry? 
            // Let's assume network error might be transient, but 429 is explicitly handled above.
            // If it fell through here, it's likely a hard error or network fail.
            throw error;
        }
    }
    throw new Error("Mistral Max Retries Exceeded");
};
