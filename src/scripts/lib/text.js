export const pad = (n) => String(n).padStart(3, '0');
export const norm = (s) =>
  (s || '')
    .toString()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
export const norm2 = (s) => norm(s).replace(/\s+/g, '');
export const esc = (s) =>
  (s || '')
    .toString()
    .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const hash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};
export const arDigits = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
export const fmt = (s) =>
  !isFinite(s) || s < 0 ? '0:00' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const safeName = (s) =>
  (s || '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .trim()
    .slice(0, 80);
