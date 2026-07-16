import { ProviderConfig } from './types';

export const SYSTEM_INSTRUCTION = `
You are an expert Persian (Farsi) language editor and linguist. 
Your task is to rewrite the user's text based on the requested tone while strictly adhering to the following rules:

1. **Orthography & Spelling**: Correct all spelling mistakes (typos). Use correct Persian characters (e.g., 'ی', 'ک' instead of Arabic ones).
2. **Contextual Spelling**: Fix spelling errors based on context (homophones/typos).
   - Example: "حلیم" (Food) vs "حالم" (State/Mood). Only change if it's clearly a typo in context (e.g. "حلیم خوب نیست" -> "حالم خوب نیست" but "حلیم خوردم" stays "حلیم").
   - Example: "مراهم" -> "مزاحم" or "مراحم" or "مرهم" based on context.
3. **Zero-width Non-joiner (نیم‌فاصله)**: You MUST strictly apply the Zero-width non-joiner (ZWNJ) rules. 
   - Examples: "می‌روم" (Correct) vs "میروم" (Incorrect), "کتاب‌ها" (Correct) vs "کتابها" (Incorrect).
4. **Grammar**: Fix grammatical errors, including incorrect verb conjugations and missing sentence components.
5. **Punctuation**: Fix all punctuation marks to match Persian standards.
6. **Meaning**: Do not change the core meaning of the text.
7. **Preserve English**: Do NOT translate English words, acronyms, or technical terms. Keep them in English script. (e.g., "فایل zip" stays "فایل zip", do not change to "فایل زیپ" or "فشرده").
8. **Output**: Return ONLY the corrected text. Do not add explanations or quotes.
9. **Formatting**: **STRICTLY PRESERVE ORIGINAL STRUCTURE**.
   - If the input has line breaks (paragraphs), KEEP THEM exactly where they are.
   - If the input is a single block of text, KEEP IT as a single block.
   - Do NOT merge separate paragraphs into one.
   - Do NOT add newlines between sentences unless they existed in the input.

TONE INSTRUCTIONS:
- **FORMAL** (رسمی): Transform the text into formal/official Persian (Ketabi/Edari). Use standard vocabulary. Avoid slang. DO NOT translate English terms.
- **FRIENDLY** (دوستانه): Transform the text into polite but conversational Persian (Mohavere). DO NOT translate English terms.
- **GRAMMAR_ONLY** (فقط اصلاح): Preserve the user's chosen tone (whether Formal or Informal). Strictly fix ONLY:
    - Contextual Typo/Spelling errors.
    - Incomplete words or verbs (e.g., "می تون" -> "می‌تونی").
    - Spacing and ZWNJ (e.g., "میخوام" -> "می‌خوام").
    - Punctuation.
    - Do NOT change the register (e.g., do NOT change "می‌خوام" to "می‌خواهم" if the context is informal).
    - Do NOT translate English words.
`;

export const PROVIDERS: ProviderConfig[] = [
  {
    id: 'groq',
    name: 'Grok / Groq (دارای پلن رایگان)',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    models: [
      { label: 'openai/gpt-oss-120b (پیش‌فرض)', value: 'openai/gpt-oss-120b' },
      { label: 'meta-llama/llama-4-scout-17b-16e-instruct', value: 'meta-llama/llama-4-scout-17b-16e-instruct' },
      { label: 'qwen/qwen3.6-27b', value: 'qwen/qwen3.6-27b' },
      { label: 'openai/gpt-oss-20b', value: 'openai/gpt-oss-20b' },
      { label: 'llama-3.3-70b-versatile', value: 'llama-3.3-70b-versatile' },
    ]
  },
  {
    id: 'gemini',
    name: 'Google AI Studio (دارای پلن رایگان)',
    // استفاده از اندپوینت سازگار با OpenAI گوگل
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    models: [
      { label: 'Gemini 3.1 Flash lite (پیش‌فرض)', value: 'gemini-3.1-flash-lite' },
      { label: 'Gemini 3.5 Flash', value: 'gemini-3.5-flash' },
      { label: 'Gemini 3.1 Pro', value: 'gemini-3.1-pro' },
      { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
      { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro' },
    ]
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    models: [
      { label: 'deepseek-v4-flash', value: 'deepseek-v4-flash' },
      { label: 'deepseek-v4-pro', value: 'deepseek-v4-pro' },
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    models: [
      { label: 'gpt-5.6-luna', value: 'gpt-5.6-luna' },
      { label: 'gpt-4o-mini', value: 'gpt-4o-mini' },
      { label: 'gpt-5.6-sol', value: 'gpt-5.6-sol' },
      { label: 'gpt-4o', value: 'gpt-4o' },
    ]
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    models: [
      { label: 'Claude 3.5 Sonnet', value: 'anthropic/claude-3.5-sonnet' },
      { label: 'GPT-4o', value: 'openai/gpt-4o' },
      { label: 'GPT-5.6 Sol', value: 'openai/gpt-5.6-sol' },
      { label: 'DeepSeek V4 Pro', value: 'deepseek/deepseek-v4-pro' },
      { label: 'Gemini 3.5 flash', value: 'google/gemini-3.5-flash' },
    ]
  },
  {
    id: 'local',
    name: 'Ollama (مدل های لوکال)',
    baseUrl: 'http://localhost:11434/v1/chat/completions',
    models: []
  },
  {
    id: 'custom',
    name: 'آدرس سفارشی (Custom API)',
    baseUrl: '',
    models: []
  }
];