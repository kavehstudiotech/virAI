
import { SYSTEM_INSTRUCTION } from '../constants';
import { Tone, AIProvider } from '../types';

export const correctText = async (
  text: string, 
  tone: Tone, 
  apiKey: string,
  provider: AIProvider = 'gemini',
  geminiModel?: string,
  customBaseUrl?: string,
  customModel?: string
): Promise<string> => {
  if (!apiKey && provider !== 'custom') { 
    throw new Error('API Key is missing. Please set it in the settings.');
  }

  const promptText = `
    Target Tone: ${tone}
    Input Text: "${text}"
    
    Rewrite the text now following the system instructions.
    `;

  try {
    // --- 1. GOOGLE GEMINI HANDLER (Native Fetch) ---
    if (provider === 'gemini') {
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
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const corrected = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!corrected) throw new Error('No response from AI.');
        return corrected.trim();
    }

    // --- 2. OPENAI / CUSTOM HANDLER ---
    let endpoint = 'https://api.openai.com/v1/chat/completions';
    let model = 'gpt-4o-mini'; 

    if (provider === 'custom') {
        if (!customBaseUrl) throw new Error('Custom Base URL is required.');
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
        const errData = await response.json();
        throw new Error(`AI API Error: ${errData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const corrected = data.choices?.[0]?.message?.content;
    
    if (!corrected) throw new Error('Invalid response format from AI Provider.');
    return corrected.trim();

  } catch (error) {
    console.error("AI Service Error:", error);
    throw error;
  }
};
