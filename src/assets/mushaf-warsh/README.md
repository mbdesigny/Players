# Mushaf pages — Warsh 'an Nafi' (self-hosted)

Drop the 604 Warsh 'an Nafi' mushaf page SVGs here, named `001.svg` … `604.svg`
(source: https://github.com/quran-ws/quran-svg — KFGQPC Warsh, CC BY 4.0; raw
pattern `mushafs/warsh/kfqc/svg/NNN.svg`). Same 604-page Madani pagination as
the Hafs mushaf, so surah/juz indexes are shared.

`src/scripts/app.js` resolves pages from this folder at build time; any page
missing here falls back to the remote raw URL.
