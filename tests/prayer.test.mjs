import test from 'node:test';
import assert from 'node:assert/strict';
import { prayerTimeStr, nextPrayerTime, countdownStr } from '../src/scripts/lib/prayer.js';

const TIMINGS = {
  Fajr: '2025-06-15T05:12:00+02:00',
  Dhuhr: '2025-06-15T12:30:00+02:00',
  Asr: '2025-06-15T15:45:00+02:00',
  Maghrib: '2025-06-15T18:20:00+02:00',
  Isha: '2025-06-15T19:50:00+02:00'
};

test('prayerTimeStr extracts HH:MM from ISO timing strings', () => {
  assert.equal(prayerTimeStr('2025-06-15T05:12:00+02:00'), '05:12');
  assert.equal(prayerTimeStr('2025-06-15T12:30:00'), '12:30');
});

test('prayerTimeStr applies per-prayer offset', () => {
  assert.equal(prayerTimeStr('2025-06-15T05:12:00+02:00', 5), '05:17');
  assert.equal(prayerTimeStr('2025-06-15T05:12:00+02:00', -5), '05:07');
  assert.equal(prayerTimeStr('2025-06-15T05:12:00+02:00', 0), '05:12');
  assert.equal(prayerTimeStr('2025-06-15T05:12:00+02:00', null), '05:12');
});

test('prayerTimeStr wraps past midnight', () => {
  assert.equal(prayerTimeStr('2025-06-15T23:58:00', 5), '00:03');
  assert.equal(prayerTimeStr('2025-06-15T00:02:00', -5), '23:57');
});

test('nextPrayerTime returns the next prayer timestamp after now', () => {
  const at = (h) => new Date('2025-06-15T00:00:00+02:00').getTime() + h * 3600000;
  const fajr = new Date('2025-06-15T05:12:00+02:00').getTime();
  assert.equal(nextPrayerTime(TIMINGS, null, at(3)), fajr);
  const asr = new Date('2025-06-15T15:45:00+02:00').getTime();
  assert.equal(nextPrayerTime(TIMINGS, null, at(13)), asr);
  const tomorrowFajr = fajr + 86400000;
  assert.equal(nextPrayerTime(TIMINGS, null, at(21)), tomorrowFajr);
});

test('nextPrayerTime honors per-prayer offsets', () => {
  const at = (h) => new Date('2025-06-15T00:00:00+02:00').getTime() + h * 3600000;
  const offsets = { Fajr: 0, Dhuhr: 10, Asr: 0, Maghrib: 0, Isha: 0 };
  const dhuhr = new Date('2025-06-15T12:30:00+02:00').getTime() + 10 * 60000;
  assert.equal(nextPrayerTime(TIMINGS, offsets, at(11)), dhuhr);
});

test('countdownStr renders hh:mm:ss remaining', () => {
  const now = new Date('2025-06-15T11:26:05+02:00').getTime();
  assert.equal(countdownStr(TIMINGS, null, now), '01:03:55');
});
