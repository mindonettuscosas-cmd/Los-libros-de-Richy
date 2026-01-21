
import { GoogleGenAI, Type } from "@google/genai";
import { Book, BookStatus } from "./types";

// Always use a named parameter for the API key
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getBookDetails = async (title: string): Promise<Partial<Book>> => {
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

export const generateBookCover = async (title: string, author: string): Promise<string> => {
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
