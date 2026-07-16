// FILE: public/changelog.js

document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('btn-close-tab');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      // استفاده از API بومی کروم برای بستن ایمن تب جاری
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.getCurrent) {
        chrome.tabs.getCurrent((tab) => {
          if (tab && tab.id !== undefined) {
            chrome.tabs.remove(tab.id);
          } else {
            window.close();
          }
        });
      } else {
        window.close();
      }
    });
  }
});