// StealthHumanizer extension — content script
// Reads ?text= query param and pre-fills the StealthHumanizer web UI

(function () {
  const params = new URLSearchParams(window.location.search);
  const prefill = params.get('text');
  if (prefill) {
    // Try to find the humanizer textarea and pre-fill it
    const observer = new MutationObserver(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value'
        )?.set;
        if (nativeSetter) {
          nativeSetter.call(textarea, prefill);
        } else {
          textarea.value = prefill;
        }
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Stop looking after 10 seconds
    setTimeout(() => observer.disconnect(), 10000);
  }
})();
