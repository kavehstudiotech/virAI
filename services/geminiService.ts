import { SYSTEM_INSTRUCTION, PROVIDERS } from '../constants';
import { Tone, ProviderId } from '../types';

export const correctText = async (
  text: string, 
  tone: Tone, 
  apiKey: string,
  providerId: ProviderId,
  model: string,
  customBaseUrl?: string,
  customPromptText?: string // اضافه شدن پارامتر اختیاری برای پرامپت شخصی
): Promise<string> => {

  const providerDef = PROVIDERS.find(p => p.id === providerId);
  if (!providerDef) throw new Error("پروایدر نامعتبر است");

  let endpointUrl = providerDef.baseUrl;
  
  if (providerId === 'local' || providerId === 'custom') {
    if (!customBaseUrl) throw new Error("آدرس API وارد نشده است.");
    endpointUrl = customBaseUrl.endsWith('/chat/completions') 
      ? customBaseUrl 
      : `${customBaseUrl.replace(/\/$/, '')}/chat/completions`;
  }

  // اگر لحن سفارشی بود و پرامپت وجود داشت، پرامپت شخصی را جایگزین دستور پیش‌فرض سیستم می‌کنیم
  const systemInstructionToUse = tone === Tone.CUSTOM && customPromptText 
    ? customPromptText 
    : SYSTEM_INSTRUCTION;

  const promptText = tone === Tone.CUSTOM
    ? `Input Text: "${text}"\nRewrite the text now following the system instructions.`
    : `Target Tone: ${tone}\nInput Text: "${text}"\nRewrite the text now following the system instructions.`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  
  if (providerId === 'openrouter') {
    headers['HTTP-Referer'] = 'https://virai.local';
    headers['X-Title'] = 'virAI Extension';
  }

  const body = JSON.stringify({
    model: model,
    messages: [
      { role: "system", content: systemInstructionToUse },
      { role: "user", content: promptText }
    ],
    temperature: 0.2,
  });

  try {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content.trim();
    } else {
      throw new Error("ساختار پاسخ ناشناخته بود.");
    }
  } catch (error: any) {
    console.error("AI Fetch Error:", error);
    throw new Error(error.message || "خطا در ارتباط با هوش مصنوعی");
  }
};