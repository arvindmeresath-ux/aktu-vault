const LAST_READ_KEY = 'aktu_last_read_session';
const PER_DOC_PREFIX = 'aktu_resume_';

export function saveReadingProgress({ title, subject, url, page, numPages }) {
  if (!url || !page || page < 1) return;
  try {
    localStorage.setItem(`${PER_DOC_PREFIX}${encodeURIComponent(url)}`, String(page));

    // Save global "Continue Studying" session if user is past page 1 (or already started reading)
    if (page > 1) {
      const payload = {
        title: title || subject || 'AKTU Study Document',
        subject: subject || '',
        url,
        link: url,
        page,
        numPages: numPages || 0,
        updatedAt: Date.now(),
      };
      localStorage.setItem(LAST_READ_KEY, JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent('aktu_reading_progress_updated', { detail: payload }));
    }
  } catch {}
}

export function getSavedPageForDoc(url) {
  if (!url) return 1;
  try {
    const raw = localStorage.getItem(`${PER_DOC_PREFIX}${encodeURIComponent(url)}`);
    const parsed = parseInt(raw, 10);
    return parsed && parsed > 1 ? parsed : 1;
  } catch {
    return 1;
  }
}

export function getLastReadSession() {
  try {
    const raw = localStorage.getItem(LAST_READ_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.url || !parsed.page || parsed.page <= 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLastReadSession() {
  try {
    localStorage.removeItem(LAST_READ_KEY);
    window.dispatchEvent(new CustomEvent('aktu_reading_progress_updated', { detail: null }));
  } catch {}
}