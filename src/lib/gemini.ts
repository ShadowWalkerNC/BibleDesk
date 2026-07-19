/**
 * gemini.ts — Google Gemini client entry point (SERVER ONLY)
 *
 * This matches the interface expected by the route handlers and pipeline,
 * dynamically wrapping model calls using Google's new GenAI SDK.
 */

import { GoogleGenAI } from '@google/genai';

let _ai: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set.');
    }
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
}

/**
 * Common call helper to complete a text prompt using Gemini 2.5 Flash
 */
export async function callGemini(
  systemInstruction: string,
  prompt: string
): Promise<string> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: systemInstruction,
    },
  });
  return response.text || '';
}
