export enum Tone {
  FORMAL = 'FORMAL',
  FRIENDLY = 'FRIENDLY',
  GRAMMAR_ONLY = 'GRAMMAR_ONLY',
  CUSTOM = 'CUSTOM', // اضافه شدن لحن سفارشی
}

// ساختار داده‌ای هر پرامپت ذخیره‌شده
export interface CustomPrompt {
  id: string;
  title: string;
  prompt: string;
}

export type ProviderId = 'groq' | 'gemini' | 'deepseek' | 'openai' | 'openrouter' | 'local' | 'custom';

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  baseUrl: string;
  models: { label: string; value: string }[];
}

export const ToneLabels: Record<Tone, string> = {
  [Tone.FORMAL]: 'رسمی (Official)',
  [Tone.FRIENDLY]: 'دوستانه (Friendly)',
  [Tone.GRAMMAR_ONLY]: 'فقط اصلاح نگارشی (Fix Grammar)',
  [Tone.CUSTOM]: 'پرامپت شخصی (Custom Prompt)', // اضافه شدن به منو
};