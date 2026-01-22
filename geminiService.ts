
import { GoogleGenAI, Type } from "@google/genai";
import { Book } from "./types";

// Función auxiliar para obtener la instancia de IA de forma segura
const getAIInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY no detectada. Las funciones de IA no estarán disponibles hasta que se configure la variable de entorno.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const getBookDetails = async (title: string): Promise<Partial<Book>> => {
  const ai = getAIInstance();
  if (!ai) throw new Error("API Key faltante");

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Proporciona los detalles técnicos del libro titulado "${title}". Traduce todo al español.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          author: { type: Type.STRING },
          year: { type: Type.INTEGER },
          description: { type: Type.STRING },
          genres: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de 3-5 etiquetas de género o temática" },
        },
        required: ["title", "author", "year", "description", "genres"]
      },
    },
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Error parsing Gemini response", e);
    return {};
  }
};

export const getAuthorBio = async (author: string): Promise<string> => {
  const ai = getAIInstance();
  if (!ai) return "Configura tu API Key para ver biografías.";

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Escribe una biografía muy breve y profesional del autor/a "${author}". Incluye su nacionalidad, estilo principal y una lista de sus 3-5 libros más famosos. Formato: un párrafo corto seguido de una lista de obras destacadas. Todo en español.`,
  });

  return response.text || "No se pudo encontrar información sobre este autor.";
};

export const generateBookCover = async (title: string, author: string): Promise<string> => {
  const ai = getAIInstance();
  if (!ai) throw new Error("API Key faltante");

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: `Genera una portada de libro profesional y artística. Título: "${title}". Autor: "${author}". El diseño debe integrar VISIBLEMENTE el título "${title}" y el nombre del autor "${author}" en la parte superior e inferior respectivamente, usando una tipografía elegante. Estilo cinematográfico, temático acorde al título, composición equilibrada 3:4.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "3:4",
      }
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return '';
};
