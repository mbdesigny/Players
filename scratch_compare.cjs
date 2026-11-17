const fs = require('fs');

const PAL = [["#2F5D3A", "#A8CBA0", "#F4F1E8", "#C9A24B"], ["#1F4030", "#D9C9A3", "#F7F3E8", "#C9A24B"], ["#3E6B48", "#8FBC8F", "#FBF9F3", "#B99745"], ["#274C3B", "#9DCB9D", "#EAF2E6", "#D4B36A"], ["#41563A", "#CBB98A", "#F4F1E8", "#B99745"], ["#2C3E30", "#B7C9A8", "#F7F9F7", "#C2A14D"]];
const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return Math.abs(h); };
const pal = seed => PAL[hash(seed) % PAL.length];

function oldAvatar(seed, letter) {
  const [bg, pt, ink, gd] = pal(seed); let sq = '', dots = '';
  for (let i = 0; i < 4; i++)sq += `<rect x="40" y="40" width="120" height="120" fill="none" stroke="${pt}" stroke-width="1.4" opacity=".45" transform="rotate(${i * 22.5} 100 100)"/>`;
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; dots += `<circle cx="${(100 + 87 * Math.cos(a)).toFixed(1)}" cy="${(100 + 87 * Math.sin(a)).toFixed(1)}" r="3" fill="${pt}" opacity=".85"/>` }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" fill="${bg}"/>${sq}${dots}<rect x="57" y="57" width="86" height="86" fill="none" stroke="${gd}" stroke-width="1.6" transform="rotate(45 100 100)"/><circle cx="100" cy="100" r="46" fill="${pt}"/><text x="100" y="117" text-anchor="middle" font-size="50" font-family="Amiri,serif" font-weight="700" fill="${bg}">${letter}</text></svg>`;
}

function newAvatar(seed, letter) {
  const [bg, pt, ink, gd] = pal(seed); let sq = '', dots = '';
  for (let i = 0; i < 4; i++)sq += `<rect x="40" y="40" width="120" height="120" fill="none" stroke="${pt}" stroke-width="1.4" opacity=".45" transform="rotate(${i * 22.5} 100 100)"/>`;
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; dots += `<circle cx="${(100 + 87 * Math.cos(a)).toFixed(1)}" cy="${(100 + 87 * Math.sin(a)).toFixed(1)}" r="3" fill="${pt}" opacity=".85"/>` }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" fill="${bg}"/>${sq}${dots}<rect x="57" y="57" width="86" height="86" fill="none" stroke="${gd}" stroke-width="1.6" transform="rotate(45 100 100)"/><circle cx="100" cy="100" r="46" fill="${pt}"/><text x="100" y="100" text-anchor="middle" dominant-baseline="central" font-size="52" font-family="'Alan Sans',system-ui,sans-serif" font-weight="700" fill="${bg}">${letter}</text></svg>`;
}

console.log('Old letter sample:');
console.log(oldAvatar('العفاسي', 'ع'));
console.log('New letter sample:');
console.log(newAvatar('العفاسي', 'ع'));
