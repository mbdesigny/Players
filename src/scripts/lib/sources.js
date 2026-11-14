import { norm2, pad } from './text.js';

export const ED_KEYS = [
  ['alafasy', 'عفاسي', 'alafasy'],
  ['husary', 'حصري', 'husary'],
  ['minshawi', 'منشاوي', 'minshawi'],
  ['abdulbasit', 'عبدالباسط', 'abdulbasit'],
  ['sudais', 'سديس', 'sudais'],
  ['shuraim', 'شريم', 'shuraym'],
  ['muaiqly', 'معيقلي', 'muaiqly'],
  ['shatri', 'شاطري', 'shaatree'],
  ['hudhaify', 'حذيفي', 'hudhaify'],
  ['ajmi', 'عجمي', 'ajamy'],
  ['ayyoub', 'ايوب', 'ayyoub'],
  ['rifai', 'رفاعي', 'rifai'],
  ['akhdar', 'اخضر', 'akhbar'],
  ['jibreel', 'جبريل', 'jibreel']
];
export const CORS_AUDIO_HOST = /^https:\/\/([a-z0-9-]+\.)*mp3quran\.net\//i;
export const corsAudio = (url) => !!url && (url.startsWith('blob:') || CORS_AUDIO_HOST.test(url));
export function parseList(str, total) {
  if (!str) return Array.from({ length: total || 114 }, (_, i) => i + 1);
  const out = new Set();
  String(str)
    .split(',')
    .forEach((tok) => {
      tok = tok.trim();
      if (!tok) return;
      if (tok.includes('-')) {
        const [a, b] = tok.split('-').map(Number);
        for (let i = a; i <= b; i++) out.add(i);
      } else {
        const n = +tok;
        if (n) out.add(n);
      }
    });
  return [...out].filter((n) => n >= 1 && n <= 114).sort((a, b) => a - b);
}
export const serverURL = (m, n) => m.server.replace(/^http:/, 'https:').replace(/\/?$/, '/') + pad(n) + '.mp3';
export function buildSources(rar, ren, moshaf, n, editions) {
  const src = [{ provider: 'MP3Quran', url: serverURL(moshaf, n), bitrate: 128 }];
  const nm = norm2(rar + ' ' + ren),
    rw = norm2((moshaf.rewaya || '') + ' ' + (moshaf.name || '')),
    mj = /مجود|mujawwad|mojawwad/.test(norm2((moshaf.name || '') + (moshaf.rewaya || '')));
  if (/حفص|hafs/.test(rw) && editions.length) {
    for (const [en, ar, key] of ED_KEYS) {
      if (nm.includes(en) || nm.includes(ar)) {
        let cands = editions.filter((e) => e.identifier.includes(key));
        if (mj)
          cands = cands.filter((e) => /mujawwad|mojawwad/.test(e.identifier)).length
            ? cands.filter((e) => /mujawwad|mojawwad/.test(e.identifier))
            : cands;
        else
          cands = cands.filter((e) => !/mujawwad|mojawwad/.test(e.identifier)).length
            ? cands.filter((e) => !/mujawwad|mojawwad/.test(e.identifier))
            : cands;
        const e = cands.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
        if (e)
          src.push({
            provider: 'Islamic Network',
            url: `https://cdn.islamic.network/quran/audio-surah/${e.bitrate || 128}/${e.identifier}/${n}.mp3`,
            bitrate: e.bitrate || 128,
            ed: e.identifier
          });
        break;
      }
    }
  }
  return src;
}
export function pickSource(track, quality) {
  const s = [...track.sources];
  if (quality === 'high') s.sort((a, b) => (b.bitrate >= 192) - (a.bitrate >= 192) || b.bitrate - a.bitrate);
  else if (quality === 'std') s.sort((a, b) => Math.abs(a.bitrate - 128) - Math.abs(b.bitrate - 128));
  else if (quality === 'save') s.sort((a, b) => a.bitrate - b.bitrate);
  else s.sort((a, b) => b.bitrate - a.bitrate);
  return s;
}
