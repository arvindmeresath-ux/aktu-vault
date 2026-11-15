const DB_NAME = 'aktu_offline_vault_db';
const STORE_NAME = 'obfuscated_docs';
const META_KEY = 'aktu_offline_docs_meta';
const XOR_KEY = 0x5a;

function openVaultDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function xorTransform(arrayBuffer) {
  const src = new Uint8Array(arrayBuffer);
  const out = new Uint8Array(src.length);
  for (let i = 0; i < src.length; i++) {
    out[i] = src[i] ^ XOR_KEY;
  }
  return out;
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getOfflineDocsMap() {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || '{}');
  } catch {
    return {};
  }
}

export function getOfflineDocsList() {
  const map = getOfflineDocsMap();
  return Object.values(map).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}

export function isDocSavedOffline(url) {
  if (!url) return false;
  return Boolean(getOfflineDocsMap()[url]);
}

export async function saveDocOffline({ url, title, subject, preloadedBytes, onProgress }) {
  if (!url) throw new Error('Invalid document URL');

  let rawBuffer = null;

  if (preloadedBytes && preloadedBytes.byteLength > 0) {
    if (onProgress) onProgress(45);
    rawBuffer = preloadedBytes.buffer
      ? preloadedBytes.buffer.slice(
          preloadedBytes.byteOffset,
          preloadedBytes.byteOffset + preloadedBytes.byteLength
        )
      : preloadedBytes;
    if (onProgress) onProgress(85);
  } else {
    if (onProgress) onProgress(10);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentLength = Number(response.headers.get('content-length')) || 0;
    if (response.body && response.body.getReader) {
      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;
      let fallbackPct = 15;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;
        if (onProgress) {
          if (contentLength > 0) {
            onProgress(Math.min(90, Math.max(10, Math.round((received / contentLength) * 90))));
          } else {
            fallbackPct = Math.min(88, fallbackPct + 8);
            onProgress(fallbackPct);
          }
        }
      }

      const merged = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
      }
      rawBuffer = merged.buffer;
    } else {
      if (onProgress) onProgress(55);
      rawBuffer = await response.arrayBuffer();
    }
  }

  if (onProgress) onProgress(95);
  const obfuscatedBytes = xorTransform(rawBuffer);

  const db = await openVaultDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(obfuscatedBytes, url);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  if (onProgress) onProgress(100);

  const map = getOfflineDocsMap();
  map[url] = {
    url,
    link: url,
    title: title || subject || 'AKTU Study Document',
    subject: subject || '',
    bytes: obfuscatedBytes.byteLength,
    savedAt: Date.now(),
  };
  localStorage.setItem(META_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent('aktu_offline_vault_updated'));
  return map[url];
}

export async function getOfflineDocData(url) {
  if (!url) return null;
  try {
    const db = await openVaultDB();
    const storedBytes = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(url);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (!storedBytes) return null;
    return xorTransform(storedBytes.buffer || storedBytes);
  } catch {
    return null;
  }
}

export async function removeOfflineDoc(url) {
  if (!url) return;
  try {
    const db = await openVaultDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(url);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}

  const map = getOfflineDocsMap();
  delete map[url];
  localStorage.setItem(META_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent('aktu_offline_vault_updated'));
}