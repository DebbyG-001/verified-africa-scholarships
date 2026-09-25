// Stores document files in the browser's IndexedDB so they stay on the student's device.
const DB = 'horizon-files';
const STORE = 'files';
let dbp;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbp = null; reject(req.error); };
  });
  return dbp;
}

function tx(mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(out?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('aborted'));
  }));
}

// When signed in, files are also saved to the student's account so they follow them to other devices.
let accountMode = false;
export const setAccountMode = (on) => { accountMode = on; };

const localPut = (id, blob) => tx('readwrite', (s) => s.put(blob, id));
const localGet = (id) => tx('readonly', (s) => s.get(id));

export async function putFile(id, blob) {
  await localPut(id, blob);
  if (accountMode) {
    const r = await fetch(`/api/me/files/${encodeURIComponent(id)}`, { method: 'PUT', body: blob, headers: { 'Content-Type': blob.type || 'application/octet-stream' }, credentials: 'same-origin' });
    if (!r.ok) throw new Error(r.status === 413 ? 'too large' : 'upload failed');
  }
}
export async function getFile(id) {
  const local = await localGet(id).catch(() => null);
  if (local || !accountMode) return local;
  const r = await fetch(`/api/me/files/${encodeURIComponent(id)}`, { credentials: 'same-origin' });
  if (!r.ok) return null;
  const blob = await r.blob();
  localPut(id, blob).catch(() => {});
  return blob;
}
export async function deleteFile(id) {
  await tx('readwrite', (s) => s.delete(id)).catch(() => {});
  if (accountMode) await fetch(`/api/me/files/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => {});
}
// Copies a file that only exists on this device into the student's account.
export async function pushLocalFile(id) {
  const local = await localGet(id).catch(() => null);
  if (!local) return;
  await fetch(`/api/me/files/${encodeURIComponent(id)}`, { method: 'PUT', body: local, headers: { 'Content-Type': local.type || 'application/octet-stream' }, credentials: 'same-origin' });
}
export const clearFiles = () => tx('readwrite', (s) => s.clear());

// Reads a File with real progress events, then stores it. Calls onProgress(0..1).
export function readWithProgress(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    reader.onload = () => resolve(new Blob([reader.result], { type: file.type || 'application/octet-stream' }));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadText(text, name, type = 'text/plain') {
  downloadBlob(new Blob([text], { type: `${type};charset=utf-8` }), name);
}

// A Word-compatible document built from simple HTML (opens in Word, Google Docs and LibreOffice).
export function downloadWord(html, name) {
  const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${name}</title>
<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.45;color:#111}h1{font-size:20pt;margin:0}h2{font-size:12pt;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #999;margin-top:16pt}p{margin:0 0 8pt}</style></head><body>${html}</body></html>`;
  downloadBlob(new Blob(['﻿', doc], { type: 'application/msword' }), name.endsWith('.doc') ? name : `${name}.doc`);
}
