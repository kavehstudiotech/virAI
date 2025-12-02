
declare var chrome: any;

const SYSTEM_INSTRUCTION = `
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

// 1. Setup Context Menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "virai-fix",
    title: "virAI: اصلاح نگارشی",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "virai-formal",
    title: "virAI: رسمی کردن متن",
    contexts: ["selection"]
  });
});

// 2. Handle Context Menu Click
chrome.contextMenus.onClicked.addListener(async (info: any, tab: any) => {
  if (info.menuItemId.startsWith("virai-") && info.selectionText) {
    const tone = info.menuItemId === "virai-formal" ? "FORMAL" : "GRAMMAR_ONLY";
    
    const data = await chrome.storage.local.get(['apiKey', 'provider', 'geminiModel', 'customBaseUrl', 'customModel']);
    
    if (!data.apiKey && data.provider !== 'custom') {
      console.error('No API Key found');
      return;
    }

    try {
      const corrected = await callAI(
          info.selectionText, 
          tone, 
          data.apiKey, 
          data.provider, 
          data.geminiModel,
          data.customBaseUrl, 
          data.customModel
      );
      
      if (tab?.id) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (text: string) => {
             document.execCommand('insertText', false, text);
          },
          args: [corrected]
        });
      }
    } catch (e) {
      console.error(e);
    }
  }
});

// 3. Handle Messages from Content Script
chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
  if (request.action === 'CORRECT_TEXT') {
    handleCorrectionRequest(request.text, sendResponse);
    return true; // Indicates async response
  }
});

async function handleCorrectionRequest(text: string, sendResponse: (response: any) => void) {
  const data = await chrome.storage.local.get(['apiKey', 'defaultTone', 'provider', 'geminiModel', 'customBaseUrl', 'customModel']);
  const apiKey = data.apiKey;
  const tone = data.defaultTone || 'FORMAL';
  const provider = data.provider || 'gemini';

  if (!apiKey && provider !== 'custom') {
    sendResponse({ success: false, error: 'API_KEY_MISSING' });
    return;
  }

  try {
    const corrected = await callAI(text, tone, apiKey, provider, data.geminiModel, data.customBaseUrl, data.customModel);
    sendResponse({ success: true, data: corrected });
  } catch (error) {
    console.error(error);
    sendResponse({ success: false, error: 'API_ERROR' });
  }
}

async function callAI(text: string, tone: string, apiKey: string, provider: string, geminiModel?: string, customBaseUrl?: string, customModel?: string) {
  const promptText = `Input: "${text}"\nTone: ${tone}\nRewrite:`;

  // --- GEMINI (via Fetch) ---
  if (!provider || provider === 'gemini') {
      // Fallback to 2.5 flash if undefined, but respect user choice
      const modelToUse = geminiModel || 'gemini-2.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: promptText }]
          }],
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }]
          },
          generationConfig: {
            temperature: 0.1
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || response.statusText);
      }

      const data = await response.json();
      const correctedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return correctedText?.trim();
  }

  // --- OPENAI / CUSTOM ---
  let endpoint = 'https://api.openai.com/v1/chat/completions';
  let model = 'gpt-4o-mini';

  if (provider === 'custom') {
     if (!customBaseUrl) throw new Error('Missing Base URL for custom provider');
     endpoint = customBaseUrl.endsWith('/chat/completions') 
        ? customBaseUrl 
        : `${customBaseUrl.replace(/\/$/, '')}/chat/completions`;
     if (customModel) model = customModel;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
        model: model,
        messages: [
            { role: "system", content: SYSTEM_INSTRUCTION },
            { role: "user", content: promptText }
        ],
        temperature: 0.1
    })
  });

  if (!response.ok) {
     throw new Error(`API Error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim();
}
