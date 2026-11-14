'use strict';
/* ─── flip-book engine (StPageFlip) — lazy-loaded only when the mushaf reading view is active ─── */
import { PageFlip } from 'page-flip';
import { MUSHAF_PAGES, JUZ_PAGE, mushafJuz, mushafSurah, mushafRight } from './lib/mushaf.js';
import { SURAH, SURAH_PAGE } from './lib/surah.js';
import { esc, arDigits } from './lib/text.js';

let ctx = null, flip = null, flipIO = null, mirrorDrag = false;

export function initFlipbook(c) { ctx = c; return api }

/* the host is CSS-mirrored for RTL, so pointer coordinates must be mirrored
   back around the book center before StPageFlip sees them */
function mirrorHandler(e) {
  if (e.__ounsFlip || !flip) return;
  const host = document.getElementById('flipHost');
  if (!host) return;
  const type = e.type;
  const inside = !!(e.target && host.contains(e.target));
  if (type === 'mousedown' || type === 'touchstart') {
    mirrorDrag = inside;
    if (!inside) return;
  } else {
    if (!mirrorDrag) return;
    if (type === 'mouseup' || type === 'touchend' || type === 'touchcancel') mirrorDrag = false;
  }
  const block = host.querySelector('.stf__block');
  if (!block) return;
  const pt = e.changedTouches && e.changedTouches.length ? e.changedTouches[0] : e;
  const r = block.getBoundingClientRect();
  const mx = 2 * r.left + r.width - pt.clientX;
  e.stopPropagation();
  if (type === 'mousedown' || type === 'touchstart') e.preventDefault();
  const common = { bubbles: true, cancelable: true, view: window, clientX: mx, clientY: pt.clientY };
  let ne;
  if (typeof TouchEvent === 'function' && e instanceof TouchEvent) {
    const changed = [...e.changedTouches].map(tt => new Touch({ identifier: tt.identifier, target: e.target, clientX: 2 * r.left + r.width - tt.clientX, clientY: tt.clientY }));
    ne = new TouchEvent(type, Object.assign(common, { changedTouches: changed }));
  } else {
    ne = new MouseEvent(type, Object.assign(common, { button: e.button, buttons: e.buttons }));
  }
  ne.__ounsFlip = true;
  (e.target || host).dispatchEvent(ne);
}
const MIRROR_EVENTS = ['mousedown', 'mousemove', 'mouseup', 'touchstart', 'touchmove', 'touchend', 'touchcancel'];
function attachMirror() { MIRROR_EVENTS.forEach(ty => document.addEventListener(ty, mirrorHandler, true)) }
function detachMirror() { mirrorDrag = false; MIRROR_EVENTS.forEach(ty => document.removeEventListener(ty, mirrorHandler, true)) }

const num = p => ctx.S.lang === 'ar' ? arDigits(p) : String(p);

function destroy() {
  detachMirror();
  if (flipIO) { flipIO.disconnect(); flipIO = null }
  if (flip) { try { flip.destroy() } catch (_) { } flip = null }
  const stg = ctx.$('#view .mushaf-stage'); if (stg) stg.classList.remove('flip-on');
}
function setSrc(p) {
  const im = document.querySelector(`#flipHost .flip-page[data-p="${p}"] img`);
  if (im && !im.getAttribute('src')) im.src = im.dataset.src;
}
function syncUI() {
  const { S, $, $$, mushafBook, mushafRight, mushafSurah, mushafJuz } = ctx;
  const n = S.readN; if (!n) return;
  const book = mushafBook(), R = book ? mushafRight(n) : n;
  const L = book && R + 1 <= MUSHAF_PAGES ? R + 1 : null;
  const footNum = L ? `${num(R)} – ${num(L)}` : `${num(R)} / ${num(MUSHAF_PAGES)}`;
  $$('#view .mf-num').forEach(el => el.textContent = footNum);
  ['mSlider', 'mSliderSide'].forEach(id => { const el = document.getElementById(id); if (el) el.value = n });
  const sc = mushafSurah(R), jz = mushafJuz(R);
  ['mSurahSel', 'mSurahSelSide'].forEach(id => { const el = document.getElementById(id); if (el) el.value = sc });
  ['mJuzSel', 'mJuzSelSide'].forEach(id => { const el = document.getElementById(id); if (el) el.value = jz });
  $$('#view [data-mlist="surah"] .ms-item').forEach(el => el.classList.toggle('active', +el.dataset.read === SURAH_PAGE[sc - 1]));
  $$('#view [data-mlist="juz"] .ms-item').forEach(el => el.classList.toggle('active', +el.dataset.read === JUZ_PAGE[jz - 1]));
}
function active() {
  const host = document.getElementById('flipHost');
  return !!(flip && host && document.contains(host));
}
async function mount() {
  const host = ctx.$('#flipHost'); if (!host || flip) return;
  const { S, store, t, esc, mushafBook, mushafRight, mushafSurah, mushafJuz, mushafSVGURL, mushafPrecache } = ctx;
  const book = mushafBook(), n = S.readN, rw = S.mushafRiwaya;
  const stg = host.closest('.mushaf-stage');
  try {
    if (!document.contains(host) || flip) return;
    if (stg) stg.classList.add('flip-on');
    const frag = document.createDocumentFragment();
    for (let p = 1; p <= MUSHAF_PAGES; p++) {
      const d = document.createElement('div');
      d.className = 'flip-page'; d.dataset.p = p;
      const sm = SURAH[mushafSurah(p) - 1];
      d.innerHTML = `<div class="flip-in"><span class="fp-juz">${t('juz')} ${num(mushafJuz(p))}</span><span class="fp-surah">${esc(S.lang === 'ar' ? sm[0] : sm[1])}</span><img data-src="${esc(mushafSVGURL(p, rw))}" alt="${t('mushaf')} — ${t('page')} ${num(p)}" draggable="false"><span class="fp-num">${num(p)}</span></div>`;
      frag.appendChild(d);
    }
    host.innerHTML = ''; host.appendChild(frag);
    const pf = new PageFlip(host, {
      width: 345, height: 550, size: 'stretch', autoSize: false,
      minWidth: 200, maxWidth: 620, minHeight: 260, maxHeight: 900,
      usePortrait: !book, showCover: false, mobileScrollSupport: false,
      drawShadow: true, maxShadowOpacity: .45, flippingTime: 700,
      startPage: Math.max(0, (book ? mushafRight(n) : n) - 1), swipeDistance: 18
    });
    pf.loadFromHTML(host.querySelectorAll('.flip-page'));
    flip = pf;
    flipIO = new IntersectionObserver(es => {
      for (const en of es) if (en.isIntersecting) { const im = en.target.querySelector('img'); if (im && !im.getAttribute('src')) im.src = im.dataset.src }
    }, { rootMargin: '600px' });
    host.querySelectorAll('.flip-page').forEach(el => flipIO.observe(el));
    const R0 = book ? mushafRight(n) : n;
    for (let p = R0 - 2; p <= R0 + 3; p++) if (p >= 1 && p <= MUSHAF_PAGES) setSrc(p);
    pf.on('flip', e => {
      const i = +e.data; if (isNaN(i)) return;
      S.readN = book ? mushafRight(i + 1) : i + 1;
      S.mushafPage = S.readN; store.set('mushafPage', S.readN); store.set(`mushafLast_${S.mushafRiwaya}`, S.readN);
      syncUI();
      for (let p = S.readN - 4; p <= S.readN + 5; p++) if (p >= 1 && p <= MUSHAF_PAGES) setSrc(p);
      mushafPrecache(S.readN, S.mushafRiwaya);
    });
    attachMirror();
  } catch (_) { if (stg) stg.classList.remove('flip-on') }
}
function go(n) {
  if (!active()) return false;
  const idx = Math.max(0, n - 1), cur = flip.getCurrentPageIndex();
  if (idx === cur + 1) flip.flipNext();
  else if (idx === cur - 1) flip.flipPrev();
  else flip.turnToPage(idx);
  syncUI();
  return true;
}
const api = { mount, destroy, go, active };
