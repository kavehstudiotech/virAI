
export enum Tone {
  FORMAL = 'FORMAL',
  FRIENDLY = 'FRIENDLY',
  GRAMMAR_ONLY = 'GRAMMAR_ONLY',
}

export type AIProvider = 'gemini' | 'openai' | 'custom';

export interface AppSettings {
  apiKey: string;
  defaultTone: Tone;
  provider: AIProvider;
  geminiModel?: string; // New field for selecting specific Gemini model
  customBaseUrl?: string;
  customModel?: string;
}

export interface AIResponse {
  original: string;
  corrected: string;
  tone: Tone;
}

export const ToneLabels: Record<Tone, string> = {
  [Tone.FORMAL]: 'رسمی (Official)',
  [Tone.FRIENDLY]: 'دوستانه (Friendly)',
  [Tone.GRAMMAR_ONLY]: 'فقط اصلاح نگارشی (Fix Grammar)',
};

export const GeminiModels = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (اصلی - سریع)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (حرفه‌ای - دقیق)' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite (سبک)' },
];
