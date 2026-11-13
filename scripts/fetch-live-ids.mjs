import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CHANNELS = { quran: 'UCos52azQNBgW63_9uDJoPDA', sunnah: 'UCROKYPep-UuODNwyipe6JMw' };
const OUT = fileURLToPath(new URL('../src/data/live.json', import.meta.url));

let prev = {};
try { prev = JSON.parse(readFileSync(OUT, 'utf8')); } catch {}

const out = {};
for (const [key, id] of Object.entries(CHANNELS)) {
  let vid = null;
  try {
    const res = await fetch(`https://www.youtube.com/channel/${id}/live`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      redirect: 'follow'
    });
    const txt = await res.text();
    const m = txt.match(/"videoId":"([\w-]{11})"/);
    if (m) vid = m[1];
  } catch {}
  out[key] = vid || prev[key] || null;
  console.log(`live ${key}: ${out[key] || 'unresolved (keeping previous value)'}`);
}

mkdirSync(new URL('../src/data', import.meta.url), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
