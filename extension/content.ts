// فایل: extension/content.ts

let shadowRoot: ShadowRoot | null = null;
let currentSelectionRange: Range | null = null;
let selectedElement: HTMLElement | null = null;
let fabElement: HTMLElement | null = null;
let modalElement: HTMLElement | null = null;
let currentSelectedText: string = "";
let rootContainer: HTMLDivElement | null = null;

// Extension States
let isExtensionEnabled = true;
let currentTheme = 'light';

// Listen to storage changes to update states dynamically
chrome.storage.local.get(['isExtensionEnabled', 'theme'], (res) => {
  if (res.isExtensionEnabled !== undefined) isExtensionEnabled = res.isExtensionEnabled;
  if (res.theme) {
    currentTheme = res.theme;
    updateThemeClass();
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.isExtensionEnabled) isExtensionEnabled = changes.isExtensionEnabled.newValue;
    if (changes.theme) {
      currentTheme = changes.theme.newValue;
      updateThemeClass();
    }
  }
});

function updateThemeClass() {
  if (rootContainer) {
    if (currentTheme === 'dark') {
      rootContainer.classList.add('dark');
    } else {
      rootContainer.classList.remove('dark');
    }
  }
}

function getShadowRoot(): ShadowRoot {
  if (!shadowRoot) {
    rootContainer = document.createElement('div');
    rootContainer.id = 'virai-extension-root';
    rootContainer.style.position = 'absolute';
    rootContainer.style.top = '0';
    rootContainer.style.left = '0';
    rootContainer.style.zIndex = '2147483647';
    // اعمال تم اولیه
    if (currentTheme === 'dark') rootContainer.classList.add('dark');
    
    document.body.appendChild(rootContainer);
    shadowRoot = rootContainer.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    // استفاده از CSS Variables برای پیاده‌سازی Dark/Light Mode
    style.textContent = `
      :host { 
        all: initial; 
        --bg-color: white;
        --text-color: #374151; /* gray-700 */
        --border-color: rgba(0,0,0,0.05);
        --header-border: #f3f4f6; /* gray-100 */
        --icon-color: #9ca3af; /* gray-400 */
        --old-bg: #fee2e2;
        --old-text: #991b1b;
        --new-bg: #f0fdfa;
        --new-text: #0f766e;
        --new-border: #ccfbf1;
        --cancel-bg: #f3f4f6;
        --cancel-hover: #e5e7eb;
        --cancel-text: #4b5563;
      }

      /* استایل‌های دارک مود وقتی کلاس dark روی container قرار می‌گیرد */
      :host(.dark) {
        --bg-color: #1f2937; /* gray-800 */
        --text-color: #e5e7eb; /* gray-200 */
        --border-color: #374151; /* gray-700 */
        --header-border: #374151; /* gray-700 */
        --icon-color: #6b7280; /* gray-500 */
        --old-bg: #450a0a; /* red-950 */
        --old-text: #fca5a5; /* red-300 */
        --new-bg: #134e4a; /* teal-950 */
        --new-text: #5eead4; /* teal-300 */
        --new-border: #0f766e; /* teal-700 */
        --cancel-bg: #374151; /* gray-700 */
        --cancel-hover: #4b5563; /* gray-600 */
        --cancel-text: #d1d5db; /* gray-300 */
      }

      .virai-fab {
        position: absolute; cursor: pointer; background: #0d9488; color: white;
        border-radius: 50%; width: 34px; height: 34px; display: flex;
        align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(13, 148, 136, 0.3);
        border: none; font-size: 16px; transition: transform 0.2s ease; z-index: 9999;
      }
      .virai-fab:hover { transform: scale(1.1); background: #0f766e; }
      
      .virai-modal {
        position: absolute;
        background: var(--bg-color); padding: 16px; border-radius: 12px; width: 320px;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3), 0 0 0 1px var(--border-color);
        display: flex; flex-direction: column; gap: 12px; z-index: 10000;
        font-family: Tahoma, "Vazirmatn", sans-serif; direction: rtl;
        animation: slideIn 0.2s ease-out;
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .virai-header {
        display: flex; justify-content: space-between; align-items: center;
        border-bottom: 1px solid var(--header-border); padding-bottom: 8px; margin-bottom: 4px;
      }
      .virai-title { margin: 0; font-size: 13px; font-weight: bold; color: #0d9488; }
      .virai-close-icon { cursor: pointer; color: var(--icon-color); font-size: 16px; line-height: 1; transition: color 0.2s;}
      .virai-close-icon:hover { color: var(--text-color); }
      
      .virai-text-box { padding: 10px; border-radius: 6px; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-word;}
      .virai-old-text { background: var(--old-bg); color: var(--old-text); text-decoration: line-through; opacity: 0.8; font-size: 12px;}
      .virai-new-text { background: var(--new-bg); color: var(--new-text); border: 1px solid var(--new-border); font-weight: 500;}
      
      .virai-actions { display: flex; gap: 8px; margin-top: 4px; }
      .virai-btn { flex: 1; padding: 8px; border-radius: 6px; border: none; cursor: pointer; font-weight: bold; font-size: 13px; font-family: inherit; transition: background 0.2s; }
      .virai-btn-cancel { background: var(--cancel-bg); color: var(--cancel-text); }
      .virai-btn-cancel:hover { background: var(--cancel-hover); }
      .virai-btn-confirm { background: #0d9488; color: white; flex: 2; display: flex; justify-content: center; gap: 6px; align-items: center;}
      .virai-btn-confirm:hover { background: #0f766e; }
    `;
    shadowRoot.appendChild(style);
  }
  return shadowRoot;
}

function hideModal() {
  if (modalElement) {
    modalElement.remove();
    modalElement = null;
  }
}

function showReviewModal(originalText: string, correctedText: string, x: number, y: number, onConfirm: () => void) {
  const root = getShadowRoot();
  hideModal(); 

  modalElement = document.createElement('div');
  modalElement.className = 'virai-modal';

  const modalWidth = 320;
  let modalX = x - (modalWidth / 2); 
  if (modalX < 10) modalX = 10;
  if (modalX + modalWidth > window.innerWidth) modalX = window.innerWidth - modalWidth - 20;
  
  modalElement.style.left = `${modalX}px`;
  modalElement.style.top = `${y + 15}px`;

  const header = document.createElement('div');
  header.className = 'virai-header';
  
  const title = document.createElement('h3');
  title.className = 'virai-title';
  title.textContent = '✨ پیشنهاد ویرا';

  const closeBtn = document.createElement('span');
  closeBtn.className = 'virai-close-icon';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = () => {
    hideModal();
    if (selectedElement) selectedElement.focus();
  };
  
  header.append(title, closeBtn);

  const oldTextEl = document.createElement('div');
  oldTextEl.className = 'virai-text-box virai-old-text';
  oldTextEl.textContent = originalText;

  const newTextEl = document.createElement('div');
  newTextEl.className = 'virai-text-box virai-new-text';
  newTextEl.textContent = correctedText;

  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'virai-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'virai-btn virai-btn-cancel';
  cancelBtn.textContent = 'انصراف';
  cancelBtn.onclick = () => {
    hideModal();
    if (selectedElement) selectedElement.focus();
  };

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'virai-btn virai-btn-confirm';
  confirmBtn.innerHTML = `✓ جایگزین کن`;
  confirmBtn.onclick = () => {
    onConfirm();
    hideModal();
  };

  actionsContainer.append(cancelBtn, confirmBtn);
  modalElement.append(header, oldTextEl, newTextEl, actionsContainer);
  
  root.appendChild(modalElement);
}

function replaceSelectedText(newText: string) {
  if (!selectedElement) return;
  selectedElement.focus();

  if (selectedElement instanceof HTMLInputElement || selectedElement instanceof HTMLTextAreaElement) {
    const start = selectedElement.selectionStart || 0;
    const end = selectedElement.selectionEnd || 0;
    const val = selectedElement.value;
    selectedElement.value = val.substring(0, start) + newText + val.substring(end);
    
    selectedElement.dispatchEvent(new Event('input', { bubbles: true }));
    selectedElement.dispatchEvent(new Event('change', { bubbles: true }));
    selectedElement.selectionStart = selectedElement.selectionEnd = start + newText.length;
  } else {
    const selection = window.getSelection();
    if (selection && currentSelectionRange) {
      selection.removeAllRanges();
      selection.addRange(currentSelectionRange);
      document.execCommand('insertText', false, newText);
    }
  }
}

function hideFab() {
  if (fabElement) {
    fabElement.remove();
    fabElement = null;
  }
}

function showFab(x: number, y: number, text: string) {
  const root = getShadowRoot();
  hideFab();
  hideModal(); 

  fabElement = document.createElement('button');
  fabElement.className = 'virai-fab';
  fabElement.textContent = '✨';
  fabElement.style.left = `${x + 5}px`;
  fabElement.style.top = `${y + 15}px`;

  fabElement.onmousedown = (e) => e.preventDefault();

  fabElement.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const modalX = x;
    const modalY = y + 20;
    
    hideFab();
    document.body.style.cursor = 'wait';

    chrome.runtime.sendMessage(
      { action: "CORRECT_TEXT", text: text },
      (response) => {
        document.body.style.cursor = 'default';
        if (response && response.correctedText) {
          showReviewModal(text, response.correctedText, modalX, modalY, () => {
            replaceSelectedText(response.correctedText);
          });
        } else if (response && response.error) {
          alert('خطای ویرا: ' + response.error);
        }
      }
    );
  };

  root.appendChild(fabElement);
}

function handleSelection(e: MouseEvent | KeyboardEvent) {
  // --- بررسی خاموش یا روشن بودن اکستنشن قبل از انجام هر کاری ---
  if (!isExtensionEnabled) return;

  const rootNode = document.getElementById('virai-extension-root');
  if (rootNode && e.target instanceof Node && rootNode.contains(e.target)) {
    return;
  }

  setTimeout(() => {
    const activeEl = document.activeElement as HTMLElement;
    let selectedText = "";

    if (activeEl instanceof HTMLTextAreaElement || (activeEl instanceof HTMLInputElement && activeEl.type === 'text')) {
      const start = activeEl.selectionStart || 0;
      const end = activeEl.selectionEnd || 0;
      selectedText = activeEl.value.substring(start, end).trim();
      selectedElement = activeEl;
    } else {
      const selection = window.getSelection();
      selectedText = selection?.toString().trim() || "";
      if (selectedText && selection && selection.rangeCount > 0) {
        currentSelectionRange = selection.getRangeAt(0).cloneRange();
      }
      selectedElement = activeEl;
    }

    if (selectedText && selectedText.length > 2) {
      let x = 0; let y = 0;

      if (e instanceof MouseEvent) {
        x = e.pageX;
        y = e.pageY;
      } else {
        const rect = activeEl.getBoundingClientRect();
        x = rect.right + window.scrollX - 40;
        y = rect.bottom + window.scrollY + 10;
      }

      showFab(x, y, selectedText);
    } else {
      hideFab();
      hideModal();
    }
  }, 10);
}

document.addEventListener('mouseup', handleSelection, true);
document.addEventListener('keyup', (e) => {
  if (e.key === 'Shift' || e.key.startsWith('Arrow')) {
    handleSelection(e);
  }
}, true);