import { SURAH_PAGE } from './surah.js';

export const MUSHAF_PAGES = 604;
export const JUZ_PAGE = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482,
  502, 522, 542, 562, 582
];
export const mushafJuz = (n) => {
  let j = 1;
  for (let i = 0; i < JUZ_PAGE.length; i++) if (JUZ_PAGE[i] <= n) j = i + 1;
  return j;
};
export const mushafSurah = (n) => {
  let s = 1;
  for (let i = 0; i < SURAH_PAGE.length; i++) if (SURAH_PAGE[i] <= n) s = i + 1;
  return s;
};
export const mushafRight = (n) => (n <= 0 ? 0 : n % 2 === 1 ? n : n >= MUSHAF_PAGES ? MUSHAF_PAGES - 1 : n - 1);
export function mushafStep(n, d, book) {
  if (!book) return Math.min(Math.max(0, n + d), MUSHAF_PAGES);
  const R = mushafRight(n);
  if (d > 0) return R === 0 ? 1 : Math.min(R + 2, MUSHAF_PAGES - 1);
  return R <= 1 ? 0 : R - 2;
}
