declare var chrome: any;
import { SYSTEM_INSTRUCTION, PROVIDERS } from '../constants';
import { ProviderId } from '../types';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "virai-fix", title: "virAI: اصلاح نگارشی", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "virai-formal", title: "virAI: رسمی کردن متن", contexts: ["selection"] });
});

chrome.contextMenus.onClicked.addListener(async (info: any, tab: any) => {
  if (info.menuItemId.startsWith("virai-") && info.selectionText) {
    const tone = info.menuItemId === "virai-formal" ? "FORMAL" : "GRAMMAR_ONLY";
    try {
      const corrected = await processCorrection(info.selectionText, tone);
      if (tab?.id) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (text: string) => document.execCommand('insertText', false, text),
          args: [corrected]
        });
      }
    } catch (e) { console.error(e); }
  }
});

chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
  if (request.action === 'CORRECT_TEXT') {
    processCorrection(request.text, null)
      .then(correctedText => sendResponse({ correctedText }))
      .catch(error => sendResponse({ error: error.message }));
    return true; 
  }
});

async function processCorrection(text: string, requestedTone: string | null): Promise<string> {
  const data = await chrome.storage.local.get([
    'apiKeys', 'selectedModels', 'provider', 'customBaseUrl', 'customModel', 'defaultTone',
    'customPrompts', 'selectedCustomPromptId' // واکشی اطلاعات پرامپت سفارشی
  ]);
  
  const tone = requestedTone || data.defaultTone || 'FORMAL';
  const providerId: ProviderId = data.provider || 'gemini';
  
  const apiKey = (data.apiKeys && data.apiKeys[providerId]) || '';
  let model = (data.selectedModels && data.selectedModels[providerId]) || '';
  const customBaseUrl = data.customBaseUrl;

  const providerDef = PROVIDERS.find(p => p.id === providerId);
  if (!providerDef) throw new Error("Invalid Provider");

  if (!model && providerDef.models.length > 0) {
    model = providerDef.models[0].value;
  }

  if (providerId === 'local' || providerId === 'custom' || model === '__custom__') {
    model = data.customModel || '';
  }

  if (providerId !== 'local' && providerId !== 'custom' && !apiKey) {
    throw new Error('لطفاً کلید API خود را در تنظیمات افزونه وارد کنید.');
  }

  let endpointUrl = providerDef.baseUrl;
  if (providerId === 'local' || providerId === 'custom') {
    if (!customBaseUrl) throw new Error("آدرس API سفارشی وارد نشده است");
    endpointUrl = customBaseUrl.endsWith('/chat/completions') 
      ? customBaseUrl : `${customBaseUrl.replace(/\/$/, '')}/chat/completions`;
  }

  if (providerId === 'gemini' && endpointUrl.includes('googleapis.com')) {
    endpointUrl = `${endpointUrl}?key=${apiKey}`;
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  if (providerId === 'openrouter') {
    headers['HTTP-Referer'] = 'https://virai.local';
    headers['X-Title'] = 'virAI';
  }

  // پیدا کردن دستورالعمل پرامپت سفارشیِ فعال
  const customPrompts = data.customPrompts || [];
  const selectedCustomPromptId = data.selectedCustomPromptId || '';
  const activePrompt = customPrompts.find((p: any) => p.id === selectedCustomPromptId);
  const customPromptText = activePrompt?.prompt || '';

  const systemInstructionToUse = tone === 'CUSTOM' && customPromptText 
    ? customPromptText 
    : SYSTEM_INSTRUCTION;

  const promptText = tone === 'CUSTOM'
    ? `Input Text: "${text}"\nRewrite the text now following the system instructions.`
    : `Target Tone: ${tone}\nInput Text: "${text}"\nRewrite the text now following the system instructions.`;

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: systemInstructionToUse },
        { role: "user", content: promptText }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    let exactError = `خطای ${response.status}`;
    try {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        exactError = errorJson.error?.message || errorJson.message || errorText;
      } catch (e) {
        exactError = errorText.substring(0, 150);
      }
    } catch (e) {}
    throw new Error(exactError);
  }

  const json = await response.json();
  if (json.choices && json.choices.length > 0) return json.choices[0].message.content.trim();
  throw new Error("پاسخ سرور خالی بود.");
}