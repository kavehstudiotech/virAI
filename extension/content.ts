
declare var chrome: any;

console.log('virAI Content Script Loaded');

let currentInput: HTMLElement | null = null;
let selectionButton: HTMLButtonElement | null = null;
let reviewModal: HTMLDivElement | null = null;

// For Inputs/Textareas
let currentSelectionRange: { start: number, end: number } | null = null;
// For ContentEditable (Gmail, etc.)
let savedRange: Range | null = null;

let lastMousePosition = { x: 0, y: 0 };

// --- 1. UI Components ---

function createFab() {
  const btn = document.createElement('button');
  btn.innerText = '✨'; 
  const bgColor = '#14b8a6'; // Teal-500
  
  btn.style.cssText = `
    position: absolute;
    z-index: 99999;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: ${bgColor};
    color: white;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    display: none;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: transform 0.2s;
    animation: fadeIn 0.2s ease-out;
  `;
  
  if (!document.getElementById('virai-style')) {
    const style = document.createElement('style');
    style.id = 'virai-style';
    style.innerText = `@keyframes fadeIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }`;
    document.head.appendChild(style);
  }
  
  btn.onmouseenter = () => { btn.style.transform = 'scale(1.1)'; };
  btn.onmouseleave = () => { btn.style.transform = 'scale(1)'; };
  
  document.body.appendChild(btn);
  return btn;
}

function createReviewModal(original: string, corrected: string, onAccept: () => void, onDiscard: () => void, x: number, y: number) {
  if (reviewModal) reviewModal.remove();

  const modal = document.createElement('div');
  reviewModal = modal;

  modal.style.cssText = `
    position: absolute;
    z-index: 100000;
    width: 300px;
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    border: 1px solid #e5e7eb;
    overflow: hidden;
    font-family: sans-serif;
    direction: rtl;
    animation: fadeIn 0.2s ease-out;
  `;

  const truncatedOriginal = original.length > 50 ? original.substring(0, 50) + '...' : original;

  modal.innerHTML = `
    <div style="background: #0d9488; color: white; padding: 8px 12px; font-size: 12px; font-weight: bold; display: flex; justify-content: space-between;">
      <span>پیشنهاد virAI</span>
      <span id="virai-close" style="cursor: pointer;">✕</span>
    </div>
    <div style="padding: 12px; font-size: 14px;">
      <div style="color: #9ca3af; text-decoration: line-through; margin-bottom: 8px; font-size: 12px;">${truncatedOriginal}</div>
      <div style="color: #115e59; background: #ccfbf1; padding: 8px; border-radius: 6px; margin-bottom: 12px; line-height: 1.6;">${corrected}</div>
      <div style="display: flex; gap: 8px;">
        <button id="virai-discard" style="flex: 1; padding: 6px; background: #f3f4f6; border: none; border-radius: 6px; color: #374151; cursor: pointer;">رد کردن</button>
        <button id="virai-accept" style="flex: 2; padding: 6px; background: #0d9488; border: none; border-radius: 6px; color: white; font-weight: bold; cursor: pointer;">جایگزین کن</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Position logic
  const modalWidth = 300;
  let finalLeft = x;
  if (finalLeft + modalWidth > window.innerWidth) {
      finalLeft = window.innerWidth - modalWidth - 20;
  }
  
  modal.style.top = `${y + 15}px`;
  modal.style.left = `${finalLeft}px`;

  document.getElementById('virai-close')?.addEventListener('click', onDiscard);
  document.getElementById('virai-discard')?.addEventListener('click', onDiscard);
  document.getElementById('virai-accept')?.addEventListener('click', onAccept);

  return modal;
}

// --- 2. Logic ---

async function handleProcess(text: string, isPartial: boolean, btnElement: HTMLButtonElement) {
  if (!text || text.trim().length === 0) return;

  btnElement.innerText = '⏳';
  btnElement.disabled = true;
  
  const modalX = lastMousePosition.x;
  const modalY = lastMousePosition.y;

  chrome.runtime.sendMessage(
    { action: 'CORRECT_TEXT', text: text }, 
    (response: any) => {
      btnElement.innerText = '✨';
      btnElement.disabled = false;
      
      if (selectionButton) selectionButton.style.display = 'none';

      if (response && response.success && response.data) {
        createReviewModal(
          text,
          response.data,
          () => {
            // ACCEPT
            if (currentInput) {
               // 1. Standard Input/Textarea
               if (currentInput.tagName === 'INPUT' || currentInput.tagName === 'TEXTAREA') {
                   const input = currentInput as HTMLInputElement | HTMLTextAreaElement;
                   if (isPartial && currentSelectionRange) {
                      input.setRangeText(response.data, currentSelectionRange.start, currentSelectionRange.end, 'end');
                   } else {
                      input.value = response.data;
                   }
                   input.dispatchEvent(new Event('input', { bubbles: true }));
               } 
               // 2. ContentEditable (Gmail, etc.)
               else if (currentInput.isContentEditable && savedRange) {
                   const selection = window.getSelection();
                   if (selection) {
                       selection.removeAllRanges();
                       selection.addRange(savedRange);
                       // execCommand is deprecated but still the most reliable way 
                       // to handle rich text editors (like Gmail) and preserve undo history.
                       document.execCommand('insertText', false, response.data);
                   }
               }
            }
            if (reviewModal) reviewModal.remove();
          },
          () => {
            // DISCARD
            if (reviewModal) reviewModal.remove();
          },
          modalX,
          modalY
        );
      } else {
        alert('خطا در دریافت پاسخ از هوش مصنوعی');
      }
    }
  );
}

// Event Listeners

document.addEventListener('mouseup', (e) => {
  lastMousePosition = { x: e.pageX, y: e.pageY };

  if (selectionButton) selectionButton.style.display = 'none';
  
  // Don't close modal if we clicked inside it
  if (reviewModal && reviewModal.contains(e.target as Node)) {
      return;
  } else if (reviewModal) {
      // Optional: Close modal if clicking outside?
      // reviewModal.remove(); reviewModal = null; 
      // User might want to click outside to read text, so maybe keep it open until explicit close.
  }

  const activeElement = document.activeElement as HTMLElement;

  if (activeElement) {
      const isInput = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';
      const isContentEditable = activeElement.isContentEditable;

      if (isInput || isContentEditable) {
          let hasSelection = false;
          let selectedText = '';

          if (isInput) {
              const input = activeElement as HTMLInputElement;
              if (input.selectionStart !== input.selectionEnd) {
                  hasSelection = true;
                  selectedText = input.value.substring(input.selectionStart || 0, input.selectionEnd || 0);
                  currentInput = input;
                  currentSelectionRange = { start: input.selectionStart || 0, end: input.selectionEnd || 0 };
              }
          } else if (isContentEditable) {
              const selection = window.getSelection();
              if (selection && !selection.isCollapsed) {
                  const text = selection.toString();
                  if (text && text.trim().length > 0) {
                      hasSelection = true;
                      selectedText = text;
                      currentInput = activeElement;
                      savedRange = selection.getRangeAt(0).cloneRange();
                  }
              }
          }

          if (hasSelection && selectedText) {
              if (!selectionButton) {
                  selectionButton = createFab(); 
                  selectionButton.addEventListener('mousedown', (ev) => {
                      // Prevent losing focus/selection
                      ev.preventDefault();
                      ev.stopPropagation();
                  });
                  selectionButton.addEventListener('click', (ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      
                      // Refetch text in case selection changed slightly or just to be safe
                      let textToProcess = '';
                      if (currentInput?.tagName === 'INPUT' || currentInput?.tagName === 'TEXTAREA') {
                          const inp = currentInput as HTMLInputElement;
                          textToProcess = inp.value.substring(currentSelectionRange?.start || 0, currentSelectionRange?.end || 0);
                      } else if (currentInput?.isContentEditable && savedRange) {
                          textToProcess = savedRange.toString();
                      }

                      if (textToProcess) {
                          handleProcess(textToProcess, true, selectionButton!);
                      }
                  });
              }
              
              selectionButton.style.top = `${e.pageY - 40}px`;
              selectionButton.style.left = `${e.pageX}px`;
              selectionButton.style.display = 'flex';
          }
      }
  }
});