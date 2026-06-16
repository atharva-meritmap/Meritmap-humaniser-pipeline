const DEFAULT_BASE_URL = 'https://stealthhumanizer.vercel.app';
const input = document.getElementById('baseUrl');
const apiKeyInput = document.getElementById('apiKey');
const modelSelect = document.getElementById('model');
const levelSelect = document.getElementById('level');
const saveBtn = document.getElementById('save');
const saveStatus = document.getElementById('saveStatus');
const humanizeBtn = document.getElementById('humanize');
const detectBtn = document.getElementById('detect');
const status = document.getElementById('status');

function normalizeBaseUrl(value) {
  try {
    const url = new URL(value || DEFAULT_BASE_URL);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Use http or https only.');
    url.hash = '';
    url.search = '';
    return url.toString().replace(/\/$/, '');
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : 'Invalid URL.');
  }
}

function showStatus(el, type, msg) {
  el.className = 'status ' + type;
  el.textContent = msg;
  if (type !== 'info') setTimeout(() => { el.className = 'status'; }, 4000);
}

// Load settings
chrome.storage.sync.get(['baseUrl', 'apiKey', 'model', 'level']).then((s) => {
  input.value = s.baseUrl || DEFAULT_BASE_URL;
  apiKeyInput.value = s.apiKey || '';
  modelSelect.value = s.model || 'gemini';
  levelSelect.value = s.level || 'medium';
  updateHumanizeState(s);
});

function updateHumanizeState(s) {
  const hasKey = !!(s.apiKey || apiKeyInput.value);
  humanizeBtn.disabled = !hasKey;
}

// Save settings
saveBtn.addEventListener('click', async () => {
  try {
    const baseUrl = normalizeBaseUrl(input.value.trim());
    const settings = {
      baseUrl,
      apiKey: apiKeyInput.value.trim(),
      model: modelSelect.value,
      level: levelSelect.value,
    };
    await chrome.storage.sync.set(settings);
    input.value = baseUrl;
    showStatus(saveStatus, 'success', 'Settings saved!');
    updateHumanizeState(settings);
  } catch (e) {
    showStatus(saveStatus, 'error', e instanceof Error ? e.message : 'Invalid settings.');
  }
});

// Humanize selected text
humanizeBtn.addEventListener('click', async () => {
  try {
    showStatus(status, 'info', 'Getting selected text...');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result: selectedText }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString(),
    });

    if (!selectedText || selectedText.trim().length === 0) {
      showStatus(status, 'error', 'No text selected. Select text on the page first.');
      return;
    }

    const s = await chrome.storage.sync.get(['baseUrl', 'apiKey', 'model', 'level']);
    const baseUrl = normalizeBaseUrl(s.baseUrl || DEFAULT_BASE_URL);

    showStatus(status, 'info', 'Humanizing...');
    humanizeBtn.disabled = true;
    humanizeBtn.innerHTML = '<span class="spinner"></span> Humanizing...';

    const response = await fetch(`${baseUrl}/api/humanize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: selectedText.slice(0, 10000),
        model: s.model || 'gemini',
        apiKey: s.apiKey,
        level: s.level || 'medium',
        style: 'humanize',
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Humanization failed.');
    }

    // Replace selected text in the page
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

    showStatus(status, 'success', `Done! Score: ${data.score || 'N/A'}% human`);
  } catch (e) {
    showStatus(status, 'error', e instanceof Error ? e.message : 'Failed to humanize.');
  } finally {
    humanizeBtn.disabled = false;
    humanizeBtn.textContent = 'Humanize Selected Text';
  }
});

// Detect selected text
detectBtn.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result: selectedText }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString(),
    });

    if (!selectedText || selectedText.trim().length === 0) {
      showStatus(status, 'error', 'No text selected. Select text on the page first.');
      return;
    }

    const s = await chrome.storage.sync.get(['baseUrl']);
    const baseUrl = normalizeBaseUrl(s.baseUrl || DEFAULT_BASE_URL);

    showStatus(status, 'info', 'Analyzing...');
    detectBtn.disabled = true;

    const response = await fetch(`${baseUrl}/api/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: selectedText.slice(0, 10000) }),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Detection failed.');

    const score = data.score || 0;
    const label = score >= 70 ? 'Likely Human' : score >= 40 ? 'Mixed/Uncertain' : 'Likely AI';
    showStatus(status, score >= 70 ? 'success' : score >= 40 ? 'info' : 'error',
      `Detection: ${score}% human — ${label}`);
  } catch (e) {
    showStatus(status, 'error', e instanceof Error ? e.message : 'Failed to detect.');
  } finally {
    detectBtn.disabled = false;
  }
});
