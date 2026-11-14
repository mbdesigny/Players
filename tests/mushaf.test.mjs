import test from 'node:test';
import assert from 'node:assert/strict';
import { MUSHAF_PAGES, JUZ_PAGE, mushafJuz, mushafSurah, mushafRight, mushafStep } from '../src/scripts/lib/mushaf.js';

test('MUSHAF_PAGES and JUZ_PAGE shape', () => {
  assert.equal(MUSHAF_PAGES, 604);
  assert.equal(JUZ_PAGE.length, 30);
  assert.equal(JUZ_PAGE[0], 1);
});

test('mushafJuz maps pages to juz', () => {
  assert.equal(mushafJuz(1), 1);
  assert.equal(mushafJuz(21), 1);
  assert.equal(mushafJuz(22), 2);
  assert.equal(mushafJuz(604), 30);
});

test('mushafSurah maps pages to surah start', () => {
  assert.equal(mushafSurah(1), 1);
  assert.equal(mushafSurah(2), 2);
  assert.equal(mushafSurah(49), 2);
  assert.equal(mushafSurah(50), 3);
  assert.equal(mushafSurah(604), 114);
});

test('mushafRight returns odd right-hand page', () => {
  assert.equal(mushafRight(0), 0);
  assert.equal(mushafRight(1), 1);
  assert.equal(mushafRight(4), 3);
  assert.equal(mushafRight(604), 603);
});

test('mushafStep without book mode steps by one within bounds', () => {
  assert.equal(mushafStep(5, 1, false), 6);
  assert.equal(mushafStep(5, -1, false), 4);
  assert.equal(mushafStep(0, -1, false), 0);
  assert.equal(mushafStep(604, 1, false), 604);
});

test('mushafStep in book mode moves by spreads', () => {
  assert.equal(mushafStep(0, 1, true), 1);
  assert.equal(mushafStep(1, 1, true), 3);
  assert.equal(mushafStep(3, 1, true), 5);
  assert.equal(mushafStep(4, 1, true), 5);
  assert.equal(mushafStep(1, -1, true), 0);
  assert.equal(mushafStep(3, -1, true), 1);
  assert.equal(mushafStep(2, -1, true), 0);
});
