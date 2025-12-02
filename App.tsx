
import React, { useState, useEffect, useRef } from 'react';
import { Save, CheckCircle2, X, Send, Paperclip, Settings2, Mail } from 'lucide-react';
import { Tone, ToneLabels, AIProvider, GeminiModels } from './types';
import { correctText } from './services/geminiService';
import { ReviewModal } from './components/ReviewModal';
import { SelectionButton } from './components/SelectionButton';

const App: React.FC = () => {
  // State for Settings
  const [apiKey, setApiKey] = useState<string>(process.env.API_KEY || '');
  const [defaultTone, setDefaultTone] = useState<Tone>(Tone.FORMAL);
  
  // New Settings for Providers
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [geminiModel, setGeminiModel] = useState<string>('gemini-2.5-flash'); // Default to 2.5 Flash
  const [customBaseUrl, setCustomBaseUrl] = useState<string>('');
  const [customModel, setCustomModel] = useState<string>('');
  
  // Detect if running in extension popup (small window) vs web demo
  const isExtensionPopup = window.innerWidth < 450; 
  const [activeTab, setActiveTab] = useState<'settings' | 'demo' | 'code'>(isExtensionPopup ? 'settings' : 'demo');
  
  const [notification, setNotification] = useState<string | null>(null);

  // State for Demo
  const [demoText, setDemoText] = useState<string>('سلام جناب مدیر. فایل ها پیوست شد. لطفا برسی کنید. ممنون');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // Selection Logic State
  const [selectionRange, setSelectionRange] = useState<{start: number, end: number} | null>(null);
  const [selectionPos, setSelectionPos] = useState<{top: number, left: number} | null>(null);
  
  // Review Logic State
  const [reviewData, setReviewData] = useState<{original: string, corrected: string, isPartial: boolean} | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Try to load from Chrome Storage first, then LocalStorage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['apiKey', 'defaultTone', 'provider', 'geminiModel', 'customBaseUrl', 'customModel'], (result: any) => {
            if (result.apiKey) setApiKey(result.apiKey);
            if (result.defaultTone) setDefaultTone(result.defaultTone);
            if (result.provider) setProvider(result.provider);
            if (result.geminiModel) setGeminiModel(result.geminiModel);
            if (result.customBaseUrl) setCustomBaseUrl(result.customBaseUrl);
            if (result.customModel) setCustomModel(result.customModel);
        });
    } else {
        const storedKey = localStorage.getItem('virai_api_key');
        const storedTone = localStorage.getItem('virai_tone');
        const storedProvider = localStorage.getItem('virai_provider');
        const storedGeminiModel = localStorage.getItem('virai_gemini_model');
        
        if (storedKey) setApiKey(storedKey);
        if (storedTone) setDefaultTone(storedTone as Tone);
        if (storedProvider) setProvider(storedProvider as AIProvider);
        if (storedGeminiModel) setGeminiModel(storedGeminiModel);
        
        // Load custom fields
        const storedUrl = localStorage.getItem('virai_custom_url');
        const storedModel = localStorage.getItem('virai_custom_model');
        if (storedUrl) setCustomBaseUrl(storedUrl);
        if (storedModel) setCustomModel(storedModel);
    }
  }, []);

  const saveSettings = () => {
    // Save to Chrome Storage for the extension to work
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ 
            apiKey: apiKey, 
            defaultTone: defaultTone,
            provider: provider,
            geminiModel: geminiModel,
            customBaseUrl: customBaseUrl,
            customModel: customModel
        }, () => {
             showNotification('تنظیمات در افزونه ذخیره شد');
        });
    }
    
    // Also save to localStorage for the web demo
    localStorage.setItem('virai_api_key', apiKey);
    localStorage.setItem('virai_tone', defaultTone);
    localStorage.setItem('virai_provider', provider);
    localStorage.setItem('virai_gemini_model', geminiModel);
    if (customBaseUrl) localStorage.setItem('virai_custom_url', customBaseUrl);
    if (customModel) localStorage.setItem('virai_custom_model', customModel);

    if (!notification) showNotification('تنظیمات ذخیره شد');
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle Text Selection in Demo
  const handleMouseUp = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    if (target.selectionStart !== target.selectionEnd) {
      // Calculate position relative to the container based on click position
      setSelectionPos({ 
        top: e.nativeEvent.offsetY - 40, 
        left: e.nativeEvent.offsetX 
      });
      setSelectionRange({ start: target.selectionStart, end: target.selectionEnd });
    } else {
      setSelectionPos(null);
      setSelectionRange(null);
    }
  };

  const handleCorrection = async (fromSelection: boolean) => {
    if (!apiKey) {
      showNotification('لطفاً ابتدا کلید API را وارد کنید');
      setActiveTab('settings');
      return;
    }

    let textToFix = demoText;
    if (fromSelection && selectionRange) {
        textToFix = demoText.substring(selectionRange.start, selectionRange.end);
    }

    setIsProcessing(true);
    try {
      const corrected = await correctText(
          textToFix, 
          defaultTone, 
          apiKey, 
          provider, 
          geminiModel,
          customBaseUrl, 
          customModel
      );
      
      setReviewData({
        original: textToFix,
        corrected: corrected,
        isPartial: fromSelection
      });
      // Hide selection button while reviewing
      setSelectionPos(null);
    } catch (error) {
      showNotification('خطا در ارتباط با هوش مصنوعی');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const applyCorrection = () => {
    if (reviewData) {
      if (reviewData.isPartial && selectionRange) {
        // Replace only the selected part
        const before = demoText.substring(0, selectionRange.start);
        const after = demoText.substring(selectionRange.end);
        setDemoText(before + reviewData.corrected + after);
      } else {
        // Replace full text
        setDemoText(reviewData.corrected);
      }
      setReviewData(null);
      setSelectionRange(null);
      showNotification('متن اصلاح شد');
    }
  };

  const discardCorrection = () => {
    setReviewData(null);
    setSelectionRange(null);
  };

  return (
    <div className={`bg-gray-100 text-gray-800 flex flex-col items-center font-sans ${isExtensionPopup ? 'w-[380px] h-[600px] overflow-hidden p-0' : 'min-h-screen py-8 px-4'}`}>
      <div className={`bg-white shadow-xl overflow-hidden border border-gray-200 flex flex-col ${isExtensionPopup ? 'w-full h-full border-0 shadow-none' : 'w-full max-w-lg rounded-2xl h-[600px]'}`}>
        
        {/* Header */}
        <div className="bg-white border-b border-gray-100 p-4 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-teal-200">
                    <span className="font-black text-2xl italic tracking-tighter pr-1">Va</span>
                </div>
                <div className="flex flex-col">
                    <h1 className="font-bold text-gray-800 text-lg leading-tight">virAI</h1>
                    <span className="text-[10px] text-teal-600 font-bold tracking-wide">ویرا؛ دستیار هوشمند</span>
                </div>
            </div>
            
            {!isExtensionPopup && (
                <div className="flex gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                    <button onClick={() => setActiveTab('demo')} className={`px-3 py-1.5 text-xs rounded-md transition-all ${activeTab === 'demo' ? 'bg-white shadow-sm text-teal-700 font-bold ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>شبیه‌ساز</button>
                    <button onClick={() => setActiveTab('settings')} className={`px-3 py-1.5 text-xs rounded-md transition-all ${activeTab === 'settings' ? 'bg-white shadow-sm text-teal-700 font-bold ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>تنظیمات</button>
                    <button onClick={() => setActiveTab('code')} className={`px-3 py-1.5 text-xs rounded-md transition-all ${activeTab === 'code' ? 'bg-white shadow-sm text-teal-700 font-bold ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>کد</button>
                </div>
            )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 relative">
          
          {/* Notification Toast */}
          {notification && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white px-4 py-2 rounded-full text-xs shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 w-max">
              <CheckCircle2 size={14} className="text-teal-400" />
              {notification}
            </div>
          )}

          {/* TAB: DEMO */}
          {activeTab === 'demo' && !isExtensionPopup && (
            <div className="p-4 h-full flex flex-col items-center justify-center">
               <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                   {/* Mock Email Header */}
                   <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                       <span className="text-sm font-medium text-gray-600">پیام جدید</span>
                       <X size={16} className="text-gray-400" />
                   </div>
                   <div className="px-4 py-2 border-b border-gray-100 flex gap-2 text-sm">
                       <span className="text-gray-400">به:</span>
                       <span className="text-gray-700">boss@company.com</span>
                   </div>
                   <div className="px-4 py-2 border-b border-gray-100 flex gap-2 text-sm">
                       <span className="text-gray-400">موضوع:</span>
                       <span className="text-gray-700">گزارش هفتگی</span>
                   </div>

                   {/* Editor Area */}
                   <div className="relative bg-white p-4 h-64">
                       <textarea
                            ref={textareaRef}
                            className="w-full h-full outline-none text-gray-800 resize-none leading-7 selection:bg-teal-100"
                            dir="rtl"
                            placeholder="متن ایمیل خود را اینجا بنویسید (متنی را انتخاب کنید تا دکمه جادویی ظاهر شود)..."
                            value={demoText}
                            onChange={(e) => setDemoText(e.target.value)}
                            onMouseUp={handleMouseUp}
                       />

                        <SelectionButton
                            visible={!!selectionPos && !reviewData}
                            position={selectionPos}
                            isLoading={isProcessing}
                            onClick={() => handleCorrection(true)}
                        />
                        
                        <ReviewModal 
                            visible={!!reviewData}
                            originalText={reviewData?.original || ''}
                            correctedText={reviewData?.corrected || ''}
                            onAccept={applyCorrection}
                            onDiscard={discardCorrection}
                        />
                   </div>

                   {/* Mock Email Footer */}
                   <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 flex justify-between items-center">
                        <div className="flex gap-4 text-gray-500">
                             <div className="font-sans text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded font-medium">
                                 {ToneLabels[defaultTone]}
                             </div>
                             <Paperclip size={18} className="cursor-pointer hover:text-gray-700" />
                        </div>
                        <button className="bg-teal-600 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-teal-700 flex items-center gap-2 transition-colors">
                            <span>ارسال</span>
                            <Send size={14} className="rotate-180" />
                        </button>
                   </div>
               </div>
            </div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="p-6 max-w-sm mx-auto space-y-5">
                {!isExtensionPopup && <h2 className="text-lg font-bold mb-4 border-b pb-2 text-teal-900">تنظیمات افزونه</h2>}
                {isExtensionPopup && (
                  <p className="text-sm text-gray-500 mb-2 leading-6">
                    برای فعال‌سازی ویرا، کلید API سرویس‌دهنده خود را وارد کنید.{" "}
                    <a 
                      href="https://kavehstudiotech.github.io/virAI-landing/#guide" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-teal-600 underline hover:text-teal-800 font-medium"
                    >
                      (راهنمای گرفتن api رایگان گوگل)
                    </a>
                  </p>
                )}
                
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide flex items-center gap-1">
                  <Settings2 size={12}/>
                  ارائه‌دهنده سرویس (AI Provider)
                </label>
                <select 
                    value={provider} 
                    onChange={(e) => setProvider(e.target.value as AIProvider)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-100 focus:border-teal-500 outline-none transition-all text-sm"
                >
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI (ChatGPT)</option>
                    <option value="custom">سرویس شخصی (Custom/Ollama)</option>
                </select>
              </div>

              {provider === 'gemini' && (
                <div className="animate-in fade-in slide-in-from-top-1">
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    نسخه جمنای (Model)
                  </label>
                  <select 
                      value={geminiModel} 
                      onChange={(e) => setGeminiModel(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-100 focus:border-teal-500 outline-none transition-all text-sm"
                  >
                      {GeminiModels.map(model => (
                          <option key={model.id} value={model.id}>{model.name}</option>
                      ))}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">
                      نسخه 2.5 Flash گزینه پیشنهادی است.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-100 focus:border-teal-500 outline-none transition-all text-left text-sm font-mono"
                  placeholder={provider === 'gemini' ? "AIzaSy..." : "sk-..."}
                  dir="ltr"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                    {provider === 'gemini' && 'کلید Google AI Studio خود را وارد کنید.'}
                    {provider === 'openai' && 'کلید OpenAI API خود را وارد کنید.'}
                    {provider === 'custom' && 'کلید دسترسی به سرویس خود را وارد کنید (اختیاری).'}
                </p>
              </div>

              {provider === 'custom' && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">Base URL</label>
                        <input
                            type="text"
                            value={customBaseUrl}
                            onChange={(e) => setCustomBaseUrl(e.target.value)}
                            className="w-full p-2 bg-white border border-gray-200 rounded text-xs ltr"
                            placeholder="https://api.openai.com/v1"
                            dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">Model Name</label>
                        <input
                            type="text"
                            value={customModel}
                            onChange={(e) => setCustomModel(e.target.value)}
                            className="w-full p-2 bg-white border border-gray-200 rounded text-xs ltr"
                            placeholder="gpt-4o"
                            dir="ltr"
                        />
                      </div>
                  </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  لحن پیش‌فرض
                </label>
                <div className="space-y-2">
                  {Object.entries(ToneLabels).map(([key, label]) => (
                    <label key={key} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${defaultTone === key ? 'bg-teal-50 border-teal-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="tone"
                        value={key}
                        checked={defaultTone === key}
                        onChange={() => setDefaultTone(key as Tone)}
                        className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={saveSettings}
                className="w-full bg-teal-800 hover:bg-teal-900 text-white py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-100 mt-4"
              >
                <Save size={18} />
                ذخیره تنظیمات
              </button>

              {/* Support Section */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                 <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-4 flex flex-col items-center text-center space-y-3 shadow-sm">
                    <div className="p-2 bg-teal-50 text-teal-600 rounded-full">
                        <Mail size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-800">ارتباط با توسعه‌دهنده</h3>
                        <p className="text-[10px] text-gray-500 mt-1">
                            برای گزارش باگ یا پیشنهادات، به ما ایمیل بزنید.
                        </p>
                    </div>
                    <a 
                        href="mailto:kavehstudiotech@gmail.com" 
                        className="w-full py-2 px-3 bg-white border border-gray-200 text-gray-600 hover:text-teal-700 hover:border-teal-300 rounded-lg text-xs font-mono transition-all flex items-center justify-center gap-2 group"
                    >
                        <span>kavehstudiotech@gmail.com</span>
                        <Mail size={12} className="opacity-50 group-hover:opacity-100" />
                    </a>
                 </div>
              </div>

            </div>
          )}

          {/* TAB: CODE */}
          {activeTab === 'code' && !isExtensionPopup && (
            <div className="p-4 space-y-4">
               <p className="text-sm text-gray-600">
                در این بخش می‌توانید کدهای مربوط به ارتباط با سرویس‌دهنده (Provider) را مشاهده کنید.
               </p>
               <div className="bg-slate-900 text-slate-300 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed">
<pre>{`// services/geminiService.ts

export const correctText = async (text, tone, apiKey, provider, baseUrl, model) => {
  if (provider === 'openai') {
     // Use standard Fetch API for OpenAI
     const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
           'Content-Type': 'application/json',
           'Authorization': \`Bearer \${apiKey}\`
        },
        body: JSON.stringify({
           model: 'gpt-4o-mini',
           messages: [...]
        })
     });
     // ... process response
  } else {
     // Use GoogleGenAI SDK
  }
}
`}</pre>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
