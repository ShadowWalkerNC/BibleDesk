/**
 * gemini.ts — Google Gemini client entry point (SERVER ONLY)
 *
 * This matches the interface expected by the route handlers and pipeline,
 * dynamically wrapping model calls using Google's new GenAI SDK.
 */

import { GoogleGenAI } from '@google/genai';

let _serverAi: GoogleGenAI | null = null;

function getServerGeminiClient(): GoogleGenAI | null {
  if (!_serverAi && process.env.GEMINI_API_KEY) {
    _serverAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _serverAi;
}

/**
 * Common call helper to complete a text prompt using Gemini 2.5 Flash.
 * Supports Bring-Your-Own-Key (BYOK) passed from client requests,
 * falling back to server environment variable if configured.
 */
export async function callGemini(
  systemInstruction: string,
  prompt: string,
  apiKeyOverride?: string
): Promise<string> {
  let ai: GoogleGenAI | null = null;

  if (apiKeyOverride && apiKeyOverride.trim().length > 0) {
    ai = new GoogleGenAI({ apiKey: apiKeyOverride.trim() });
  } else {
    ai = getServerGeminiClient();
  }

  if (!ai) {
    throw new Error(
      'Gemini API key is required for AI features. Please enter your free Gemini API key in Settings (Bible text & study reader remain 100% free and shared).'
    );
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: systemInstruction,
    },
  });

  return response.text || '';
}

