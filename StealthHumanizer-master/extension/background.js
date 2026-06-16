const DEFAULT_BASE_URL = 'https://stealthhumanizer.vercel.app';

function normalizeBaseUrl(value) {
  try {
    const url = new URL(value || DEFAULT_BASE_URL);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return DEFAULT_BASE_URL;
    url.hash = '';
    url.search = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return DEFAULT_BASE_URL;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'humanize-selection',
    title: 'Humanize with StealthHumanizer',
    contexts: ['selection'],
  });
  chrome.contextMenus.create({
    id: 'detect-selection',
    title: 'Detect AI in selection',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.selectionText) return;
  const { baseUrl = DEFAULT_BASE_URL, apiKey = '', model = 'gemini', level = 'medium' } =
    await chrome.storage.sync.get(['baseUrl', 'apiKey', 'model', 'level']);
  const base = normalizeBaseUrl(baseUrl);

  if (info.menuItemId === 'humanize-selection') {
    try {
      const response = await fetch(`${base}/api/humanize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: info.selectionText.slice(0, 10000),
          model,
          apiKey,
          level,
          style: 'humanize',
        }),
      });
      const data = await response.json();
      if (data.success && data.fullText) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (humanized) => {
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
              const range = sel.getRangeAt(0);
              range.deleteContents();
              range.insertNode(document.createTextNode(humanized));
              sel.removeAllRanges();
            }
          },
          args: [data.fullText],
        });
      }
    } catch (e) {
      console.error('StealthHumanizer extension error:', e);
    }
  } else if (info.menuItemId === 'detect-selection') {
    try {
      const response = await fetch(`${base}/api/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: info.selectionText.slice(0, 10000) }),
      });
      const data = await response.json();
      if (data.success) {
        const score = data.score || 0;
        const label = score >= 70 ? 'Likely Human' : score >= 40 ? 'Mixed' : 'Likely AI';
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (msg) => {
            const el = document.createElement('div');
            el.textContent = msg;
            Object.assign(el.style, {
              position: 'fixed', bottom: '20px', right: '20px', zIndex: '999999',
              padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
              background: msg.includes('Human') ? 'rgba(34,197,94,0.95)' : msg.includes('AI') ? 'rgba(239,68,68,0.95)' : 'rgba(234,179,8,0.95)',
              color: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', fontFamily: 'system-ui',
              transition: 'all 0.3s ease', opacity: '0', transform: 'translateY(10px)',
            });
            document.body.appendChild(el);
            requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
            setTimeout(() => {
              el.style.opacity = '0'; el.style.transform = 'translateY(10px)';
              setTimeout(() => el.remove(), 300);
            }, 4000);
          },
          args: [`StealthHumanizer Detection: ${score}% human — ${label}`],
        });
      }
    } catch (e) {
      console.error('StealthHumanizer detection error:', e);
    }
  }
});
