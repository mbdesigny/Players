import test from 'node:test';
import assert from 'node:assert/strict';
import { pad, norm, norm2, esc, hash, arDigits, fmt, safeName } from '../src/scripts/lib/text.js';

test('pad zero-fills to 3 digits', () => {
  assert.equal(pad(1), '001');
  assert.equal(pad(42), '042');
  assert.equal(pad(604), '604');
});

test('norm strips diacritics, unifies alef and collapses spaces', () => {
  assert.equal(norm('  أَلْعَفَاسِي  '), 'العفاسي');
  assert.equal(norm('إبراهيم آل علي'), 'ابراهيم ال علي');
  assert.equal(norm(null), '');
});

test('norm2 removes all spaces', () => {
  assert.equal(norm2('عبد الباسط عبد الصمد'), 'عبدالباسطعبدالصمد');
});

test('esc escapes HTML-sensitive characters', () => {
  assert.equal(esc('<b class="x">&\''), '&lt;b class=&quot;x&quot;&gt;&amp;&#39;');
  assert.equal(esc(''), '');
  assert.equal(esc(null), '');
});

test('hash is deterministic and non-negative', () => {
  assert.equal(hash('abc'), hash('abc'));
  assert.ok(hash('abc') >= 0);
  assert.notEqual(hash('abc'), hash('abd'));
});

test('arDigits converts ASCII digits to Arabic-Indic', () => {
  assert.equal(arDigits('12:34'), '١٢:٣٤');
  assert.equal(arDigits(604), '٦٠٤');
});

test('fmt formats seconds as m:ss', () => {
  assert.equal(fmt(0), '0:00');
  assert.equal(fmt(65), '1:05');
  assert.equal(fmt(3600), '60:00');
  assert.equal(fmt(NaN), '0:00');
  assert.equal(fmt(-5), '0:00');
});

test('safeName strips filesystem-hostile characters and truncates', () => {
  assert.equal(safeName('Al-Fatiha: <test>'), 'Al-Fatiha- -test-');
  assert.equal(safeName('x'.repeat(100)).length, 80);
  assert.equal(safeName(null), '');
});
