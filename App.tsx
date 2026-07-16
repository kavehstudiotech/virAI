import React, { useState, useEffect, useRef } from 'react';
import { Save, CheckCircle2, X, Send, Settings2, Power, Moon, Sun } from 'lucide-react';
import { Tone, ToneLabels, ProviderId, CustomPrompt } from './types';
import { PROVIDERS } from './constants';
import { correctText } from './services/geminiService';
import { ReviewModal } from './components/ReviewModal';
import { SelectionButton } from './components/SelectionButton';

const App: React.FC = () => {
  // --- States ---
  const [provider, setProvider] = useState<ProviderId>('gemini');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [customBaseUrl, setCustomBaseUrl] = useState<string>('');
  const [customModel, setCustomModel] = useState<string>('');
  const [defaultTone, setDefaultTone] = useState<Tone>(Tone.FORMAL);

  const [isExtensionEnabled, setIsExtensionEnabled] = useState<boolean>(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Custom Prompt Management States
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [selectedCustomPromptId, setSelectedCustomPromptId] = useState<string>('');
  const [promptTitle, setPromptTitle] = useState<string>('');
  const [promptText, setPromptText] = useState<string>('');
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

  const isExtensionPopup = window.innerWidth < 450;
  const [activeTab, setActiveTab] = useState<'settings' | 'demo' | 'code'>(isExtensionPopup ? 'settings' : 'demo');
  const [notification, setNotification] = useState<string | null>(null);

  // Demo States
  const [demoText, setDemoText] = useState<string>('سلام جناب مدیر. فایل ها پیوست شد. لطفا برسی کنید. ممنون');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectionRange, setSelectionRange] = useState<{ start: number, end: number } | null>(null);
  const [selectionPos, setSelectionPos] = useState<{ top: number, left: number } | null>(null);
  const [reviewData, setReviewData] = useState<{ original: string, corrected: string, isPartial: boolean } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Load Settings ---
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(
        [
          'apiKeys', 'selectedModels', 'provider', 'customBaseUrl', 'customModel', 'defaultTone', 'apiKey', 
          'isExtensionEnabled', 'theme', 'customPrompts', 'selectedCustomPromptId'
        ], 
        (res: any) => {
          if (res.provider) setProvider(res.provider);
          if (res.defaultTone) setDefaultTone(res.defaultTone);
          if (res.customBaseUrl) setCustomBaseUrl(res.customBaseUrl);
          if (res.customModel) setCustomModel(res.customModel);
          if (res.isExtensionEnabled !== undefined) setIsExtensionEnabled(res.isExtensionEnabled);
          if (res.theme) setTheme(res.theme);
          if (res.customPrompts) setCustomPrompts(res.customPrompts);
          if (res.selectedCustomPromptId) setSelectedCustomPromptId(res.selectedCustomPromptId);
          
          let loadedKeys = res.apiKeys || {};
          if (res.apiKey && !loadedKeys['gemini']) loadedKeys['gemini'] = res.apiKey;
          setApiKeys(loadedKeys);
          if (res.selectedModels) setSelectedModels(res.selectedModels);
        }
      );
    }
  }, []);

  // --- Sync Theme to DOM ---
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [theme]);

  // --- Sync & Save Custom Prompts to local storage ---
  const savePromptsToStorage = (updatedList: CustomPrompt[], activeId: string) => {
    setCustomPrompts(updatedList);
    setSelectedCustomPromptId(activeId);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ 
        customPrompts: updatedList, 
        selectedCustomPromptId: activeId 
      });
    }
  };

  const handleAddOrEditPrompt = () => {
    if (!promptTitle.trim() || !promptText.trim()) {
      showNotification('تایتل و متن پرامپت نمی‌توانند خالی باشند');
      return;
    }

    let updatedList = [...customPrompts];
    let activeId = selectedCustomPromptId;

    if (editingPromptId) {
      // حالت ویرایش
      updatedList = updatedList.map(p => 
        p.id === editingPromptId ? { ...p, title: promptTitle, prompt: promptText } : p
      );
      showNotification('پرامپت ویرایش شد');
    } else {
      // حالت ثبت پرامپت جدید
      const newPrompt: CustomPrompt = {
        id: Date.now().toString(),
        title: promptTitle,
        prompt: promptText
      };
      updatedList.push(newPrompt);
      activeId = newPrompt.id; // پرامپت جدید اتوماتیک فعال شود
      showNotification('پرامپت جدید اضافه شد');
    }

    savePromptsToStorage(updatedList, activeId);
    resetForm();
  };

  const handleDeletePrompt = (id: string) => {
    const updatedList = customPrompts.filter(p => p.id !== id);
    let activeId = selectedCustomPromptId;
    if (activeId === id) {
      activeId = updatedList.length > 0 ? updatedList[0].id : '';
    }
    savePromptsToStorage(updatedList, activeId);
    showNotification('پرامپت حذف شد');
  };

  const startEdit = (p: CustomPrompt) => {
    setEditingPromptId(p.id);
    setPromptTitle(p.title);
    setPromptText(p.prompt);
    setIsFormOpen(true);
  };

  const resetForm = () => {
    setEditingPromptId(null);
    setPromptTitle('');
    setPromptText('');
    setIsFormOpen(false);
  };

  // --- Toggle Functions ---
  const togglePower = () => {
    const newState = !isExtensionEnabled;
    setIsExtensionEnabled(newState);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ isExtensionEnabled: newState });
    }
    showNotification(newState ? 'افزونه روشن شد' : 'افزونه خاموش شد');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ theme: newTheme });
    }
  };

  // --- Save Settings ---
  const saveSettings = () => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        apiKeys, selectedModels, provider, customBaseUrl, customModel, defaultTone,
        customPrompts, selectedCustomPromptId
      }, () => {
        showNotification('تنظیمات ذخیره شد');
      });
    }
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // --- Helpers for Demo ---
  const handleMouseUp = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    if (target.selectionStart !== target.selectionEnd) {
      setSelectionPos({ top: e.nativeEvent.offsetY - 40, left: e.nativeEvent.offsetX });
      setSelectionRange({ start: target.selectionStart, end: target.selectionEnd });
    } else {
      setSelectionPos(null);
      setSelectionRange(null);
    }
  };

  const handleCorrection = async (fromSelection: boolean) => {
    const currentKey = apiKeys[provider];
    if (provider !== 'local' && provider !== 'custom' && !currentKey) {
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
      let finalModel = selectedModels[provider] || '';
      if (finalModel === '__custom__' || provider === 'local' || provider === 'custom') finalModel = customModel;
      
      // اگر لحن فعال سفارشی است، پرامپت آن را به تابع ارسال می‌کنیم
      const activePromptText = defaultTone === Tone.CUSTOM
        ? (customPrompts.find(p => p.id === selectedCustomPromptId)?.prompt || '')
        : undefined;

      const corrected = await correctText(
        textToFix, 
        defaultTone, 
        currentKey || '', 
        provider, 
        finalModel, 
        customBaseUrl,
        activePromptText
      );
      
      setReviewData({ original: textToFix, corrected: corrected, isPartial: fromSelection });
      setSelectionPos(null);
    } catch (error: any) {
      showNotification('خطا: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const applyCorrection = () => {
    if (reviewData) {
      if (reviewData.isPartial && selectionRange) {
        const before = demoText.substring(0, selectionRange.start);
        const after = demoText.substring(selectionRange.end);
        setDemoText(before + reviewData.corrected + after);
      } else {
        setDemoText(reviewData.corrected);
      }
      setReviewData(null);
      setSelectionRange(null);
      showNotification('متن اصلاح شد');
    }
  };

  const currentProviderConfig = PROVIDERS.find(p => p.id === provider);
  const isDark = theme === 'dark';

  return (
    <div className={`${isDark ? 'bg-gray-900 text-gray-200' : 'bg-gray-100 text-gray-800'} flex flex-col items-center font-sans transition-colors duration-200 ${isExtensionPopup ? 'w-[380px] h-[600px] overflow-hidden p-0' : 'min-h-screen py-8 px-4'}`}>
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-xl overflow-hidden border flex flex-col transition-colors duration-200 ${isExtensionPopup ? 'w-full h-full border-0 shadow-none' : 'w-full max-w-lg rounded-2xl h-[600px]'}`}>
        
        {/* Header */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} border-b p-4 flex items-center justify-between sticky top-0 z-10 transition-colors duration-200`}>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-teal-200">
              <span className="font-black text-2xl italic tracking-tighter pr-1">Va</span>
            </div>
            <div className="flex flex-col">
              <h1 className={`font-bold text-lg leading-tight ${isDark ? 'text-white' : 'text-gray-800'}`}>virAI</h1>
              <span className={`text-[10px] font-bold tracking-wide ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>ویرا؛ دستیار هوشمند</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={toggleTheme} 
                className={`p-1.5 rounded-full cursor-pointer transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                title={isDark ? "تم روشن" : "تم تاریک"}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button 
                type="button"
                onClick={togglePower} 
                className={`p-1.5 rounded-full cursor-pointer transition-colors ${isExtensionEnabled ? (isDark ? 'text-teal-400 hover:bg-teal-900/30' : 'text-teal-600 hover:bg-teal-50') : (isDark ? 'text-gray-500 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100')}`}
                title={isExtensionEnabled ? "خاموش کردن افزونه" : "روشن کردن افزونه"}
              >
                <Power size={16} />
              </button>
            </div>

            {!isExtensionPopup && (
              <div className={`flex gap-1 p-1 rounded-lg border ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                <button type="button" onClick={() => setActiveTab('demo')} className={`px-3 py-1.5 text-xs rounded-md transition-all ${activeTab === 'demo' ? (isDark ? 'bg-gray-700 text-teal-300 ring-1 ring-gray-600 font-bold' : 'bg-white text-teal-700 shadow-sm ring-1 ring-gray-200 font-bold') : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')}`}>شبیه‌ساز</button>
                <button type="button" onClick={() => setActiveTab('settings')} className={`px-3 py-1.5 text-xs rounded-md transition-all ${activeTab === 'settings' ? (isDark ? 'bg-gray-700 text-teal-300 ring-1 ring-gray-600 font-bold' : 'bg-white text-teal-700 shadow-sm ring-1 ring-gray-200 font-bold') : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')}`}>تنظیمات</button>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className={`flex-1 overflow-y-auto hide-scrollbar relative transition-colors duration-200 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
          
          {notification && (
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs shadow-lg flex items-center gap-2 animate-in fade-in w-max ${isDark ? 'bg-gray-700 border border-gray-600 text-white' : 'bg-gray-800 text-white'}`}>
              <CheckCircle2 size={14} className="text-teal-400" />
              {notification}
            </div>
          )}

          {/* TAB: DEMO */}
          {activeTab === 'demo' && !isExtensionPopup && (
            <div className="p-4 h-full flex flex-col items-center justify-center">
              <div className={`w-full rounded-xl shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className={`px-4 py-3 border-b flex justify-between items-center ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>پیام جدید</span>
                  <X size={16} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                </div>
                <div className={`relative p-4 h-64 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                  <textarea
                    ref={textareaRef}
                    className={`w-full h-full outline-none bg-transparent resize-none leading-7 selection:bg-teal-500/30 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}
                    dir="rtl"
                    placeholder="متن خود را اینجا بنویسید و Select کنید..."
                    value={demoText}
                    onChange={(e) => setDemoText(e.target.value)}
                    onMouseUp={handleMouseUp}
                  />
                  <SelectionButton visible={!!selectionPos && !reviewData} position={selectionPos} isLoading={isProcessing} onClick={() => handleCorrection(true)} />
                  <ReviewModal visible={!!reviewData} originalText={reviewData?.original || ''} correctedText={reviewData?.corrected || ''} onAccept={applyCorrection} onDiscard={() => { setReviewData(null); setSelectionRange(null); }} />
                </div>
                <div className={`px-4 py-3 border-t flex justify-between items-center ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                  <div className={`font-sans text-xs px-2 py-1 rounded font-medium ${isDark ? 'bg-teal-900/40 text-teal-300' : 'bg-teal-100 text-teal-700'}`}>
                    {defaultTone === Tone.CUSTOM 
                      ? (customPrompts.find(p => p.id === selectedCustomPromptId)?.title || 'پرامپت سفارشی')
                      : ToneLabels[defaultTone]}
                  </div>
                  <button type="button" className="bg-teal-600 text-white px-6 py-2 rounded-full text-sm font-medium flex items-center gap-2">
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
              
              {!isExtensionEnabled && (
                <div className={`p-3 rounded-lg text-xs font-bold text-center mb-4 border ${isDark ? 'bg-yellow-900/30 border-yellow-800 text-yellow-400' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
                  ⚠️ افزونه خاموش است. برای استفاده، دکمه بالا را بزنید.
                </div>
              )}

              {/* Provider Selection */}
              <div>
                <label className={`block text-xs font-bold mb-2 uppercase flex items-center gap-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <Settings2 size={12} /> ارائه‌دهنده سرویس
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as ProviderId)}
                  className={`w-full p-2.5 border rounded-lg outline-none text-sm focus:ring-2 transition-colors ${isDark ? 'bg-gray-800 border-gray-700 text-white focus:ring-teal-900' : 'bg-white border-gray-200 text-gray-800 focus:ring-teal-100'}`}
                >
                  {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* API Key */}
              {provider !== 'local' && (
                <div className="animate-in fade-in">
                  <label className={`block text-xs font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>کلید API</label>
                  <input
                    type="password"
                    value={apiKeys[provider] || ''}
                    onChange={(e) => setApiKeys({ ...apiKeys, [provider]: e.target.value })}
                    className={`w-full p-3 border rounded-lg text-sm font-mono outline-none focus:ring-2 ltr text-left transition-colors ${isDark ? 'bg-gray-800 border-gray-700 text-white focus:ring-teal-900' : 'bg-white border-gray-200 text-gray-800 focus:ring-teal-100'}`}
                    placeholder="Enter API Key..."
                    dir="ltr"
                  />
                </div>
              )}

              {/* Model Selection */}
              {currentProviderConfig && currentProviderConfig.models.length > 0 && (
                <div className="animate-in fade-in">
                  <label className={`block text-xs font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>انتخاب مدل</label>
                  <select
                    value={selectedModels[provider] || currentProviderConfig.models[0].value}
                    onChange={(e) => setSelectedModels({ ...selectedModels, [provider]: e.target.value })}
                    className={`w-full p-2.5 border rounded-lg text-sm outline-none focus:ring-2 ltr transition-colors ${isDark ? 'bg-gray-800 border-gray-700 text-white focus:ring-teal-900' : 'bg-white border-gray-200 text-gray-800 focus:ring-teal-100'}`}
                    dir="ltr"
                  >
                    {currentProviderConfig.models.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    <option value="__custom__">سفارشی...</option>
                  </select>
                </div>
              )}

              {/* Custom / Local Fields */}
              {(provider === 'local' || provider === 'custom' || selectedModels[provider] === '__custom__') && (
                <div className={`p-3 rounded-lg border space-y-3 animate-in fade-in ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  {(provider === 'local' || provider === 'custom') && (
                    <div>
                      <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Base URL</label>
                      <input
                        type="text"
                        value={customBaseUrl}
                        onChange={(e) => setCustomBaseUrl(e.target.value)}
                        className={`w-full p-2 border rounded text-xs ltr text-left ${isDark ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-800'}`}
                        placeholder="https://api.example.com/v1"
                        dir="ltr"
                      />
                    </div>
                  )}
                  <div>
                    <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Model Name</label>
                    <input
                      type="text"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      className={`w-full p-2 border rounded text-xs ltr text-left ${isDark ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-800'}`}
                      placeholder="e.g. gpt-4"
                      dir="ltr"
                    />
                  </div>
                </div>
              )}

              {/* Tone Selection */}
              <div>
                <label className={`block text-xs font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>لحن پیش‌فرض</label>
                <div className="space-y-2">
                  {Object.entries(ToneLabels).map(([key, label]) => (
                    <label key={key} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                      defaultTone === key 
                        ? (isDark ? 'bg-teal-900/30 border-teal-700' : 'bg-teal-50 border-teal-200') 
                        : (isDark ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-gray-300')
                    }`}>
                      <input
                        type="radio"
                        name="tone"
                        value={key}
                        checked={defaultTone === key}
                        onChange={() => setDefaultTone(key as Tone)}
                        className="w-4 h-4 text-teal-600"
                      />
                      <span className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Prompt Manager Section */}
              {defaultTone === Tone.CUSTOM && (
                <div className={`p-4 rounded-lg border space-y-4 animate-in fade-in transition-colors ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>مدیریت پرامپت‌های سفارشی</span>
                    {!isFormOpen && (
                      <button
                        type="button"
                        onClick={() => setIsFormOpen(true)}
                        className="text-[11px] bg-teal-600 hover:bg-teal-700 text-white px-2.5 py-1.5 rounded font-medium cursor-pointer transition-colors"
                      >
                        افزودن جدید
                      </button>
                    )}
                  </div>

                  {isFormOpen ? (
                    /* فرم ثبت و ویرایش پرامپت */
                    <div className={`space-y-3 p-3 rounded-lg border border-dashed ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
                      <div>
                        <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-650'}`}>عنوان پرامپت</label>
                        <input
                          type="text"
                          value={promptTitle}
                          onChange={(e) => setPromptTitle(e.target.value)}
                          placeholder="مثال: ویرایش علمی"
                          className={`w-full p-2 border rounded text-xs transition-colors outline-none focus:ring-1 focus:ring-teal-500 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-655'}`}>دستورالعمل (Prompt)</label>
                        <textarea
                          value={promptText}
                          onChange={(e) => setPromptText(e.target.value)}
                          placeholder="مثال: ساختار نگارشی ورودی را حفظ کن اما کلمات عامیانه را به علمی و تخصصی تغییر بده."
                          rows={3}
                          className={`w-full p-2 border rounded text-xs transition-colors outline-none resize-none focus:ring-1 focus:ring-teal-500 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={resetForm}
                          className={`text-[10px] px-2.5 py-1.5 rounded font-medium cursor-pointer transition-colors ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                        >
                          انصراف
                        </button>
                        <button
                          type="button"
                          onClick={handleAddOrEditPrompt}
                          className="text-[10px] bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded font-medium cursor-pointer transition-colors"
                        >
                          ذخیره پرامپت
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* لیست پرامپت‌های ذخیره‌شده */
                    <div className="space-y-3">
                      {customPrompts.length === 0 ? (
                        <div className={`text-xs text-center py-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          هیچ پرامپت شخصی ثبت نشده است. یک پرامپت جدید بسازید.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>انتخاب پرامپت فعال:</label>
                          <div className="space-y-1.5">
                            {customPrompts.map((p) => {
                              const isActive = selectedCustomPromptId === p.id;
                              return (
                                <div 
                                  key={p.id} 
                                  onClick={() => savePromptsToStorage(customPrompts, p.id)}
                                  className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                                    isActive 
                                      ? (isDark ? 'bg-teal-900/30 border-teal-650' : 'bg-teal-50/50 border-teal-300') 
                                      : (isDark ? 'bg-gray-900 border-gray-800 hover:border-gray-750' : 'bg-white border-gray-200 hover:border-gray-300')
                                  }`}
                                >
                                  <div className="flex flex-col gap-0.5 overflow-hidden text-right">
                                    <span className={`text-xs font-bold truncate ${isActive ? 'text-teal-400 font-black' : (isDark ? 'text-gray-200' : 'text-gray-800')}`}>{p.title}</span>
                                    <span className={`text-[10px] truncate max-w-[190px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{p.prompt}</span>
                                  </div>
                                  <div className="flex gap-2 shrink-0 mr-2" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      onClick={() => startEdit(p)}
                                      className={`text-[10px] hover:underline cursor-pointer ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
                                    >
                                      ویرایش
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePrompt(p.id)}
                                      className="text-[10px] text-red-500 hover:underline cursor-pointer"
                                    >
                                      حذف
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={saveSettings}
                className="w-full bg-teal-700 hover:bg-teal-800 text-white py-3 rounded-lg font-medium shadow-lg shadow-teal-900/20 mt-4 flex justify-center gap-2 transition-colors"
              >
                <Save size={18} />
                ذخیره تنظیمات
              </button>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;