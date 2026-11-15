const modalStack = [];
let installed = false;

function ensureListener() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener(
    'popstate',
    (e) => {
      if (modalStack.length > 0) {
        e.stopImmediatePropagation();
        const top = modalStack.pop();
        window.__aktuIgnoreNextPop = true;
        setTimeout(() => {
          window.__aktuIgnoreNextPop = false;
        }, 400);
        if (top && typeof top.onBack === 'function') {
          top.onBack();
        }
      }
    },
    true
  );
}

export function hasOpenModal() {
  return modalStack.length > 0 || Boolean(window.__aktuIgnoreNextPop);
}

export function pushModalBack(id, onBack) {
  ensureListener();
  const idx = modalStack.findIndex((m) => m.id === id);
  if (idx !== -1) modalStack.splice(idx, 1);

  modalStack.push({ id, onBack });
  window.history.pushState({ ...(window.history.state || {}), aktuModal: id }, '');
}

export function popModalBack(id, viaHistoryBack = false) {
  const idx = modalStack.findIndex((m) => m.id === id);
  if (idx === -1) return;
  modalStack.splice(idx, 1);

  if (!viaHistoryBack && window.history.state?.aktuModal === id) {
    window.__aktuIgnoreNextPop = true;
    setTimeout(() => {
      window.__aktuIgnoreNextPop = false;
    }, 400);
    window.history.back();
  }
}

if (typeof window !== 'undefined') {
  window.__aktuHasOpenModal = hasOpenModal;
}