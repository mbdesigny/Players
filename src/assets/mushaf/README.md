# Mushaf pages (self-hosted)

Drop the 604 Madani mushaf page SVGs here, named `001.svg` … `604.svg`
(source: https://github.com/Younes12345698/pro-muslim-mushaf/tree/main/svg —
Madani mushaf, CC-BY-NC 4.0).

`src/scripts/app.js` resolves pages from this folder at build time
(`import.meta.glob`); any page missing here falls back to a remote chain:
jsdelivr CDN SVG → raw GitHub SVG → jsdelivr PNG (light). The same chain is
used by the «download all pages» ZIP builder.

`001.svg` and `002.svg` are already included and pre-fixed: the source files
use a square 235×235 artboard, so they are wrapped into the standard
345×550 page frame (content scaled to page width, vertically centered).
Do not overwrite them when copying your download.
