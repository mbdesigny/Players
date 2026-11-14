import test from 'node:test';
import assert from 'node:assert/strict';
import { ED_KEYS, corsAudio, serverURL, parseList, buildSources, pickSource } from '../src/scripts/lib/sources.js';

const MOSHAF = { server: 'http://server8.mp3quran.net/afs/', rewaya: 'حفص عن عاصم', name: 'مرتل' };

test('ED_KEYS covers 14 well-known editions', () => {
  assert.equal(ED_KEYS.length, 14);
  assert.ok(ED_KEYS.some((e) => e[2] === 'alafasy'));
});

test('corsAudio only trusts blob: and mp3quran hosts', () => {
  assert.ok(corsAudio('blob:xyz'));
  assert.ok(corsAudio('https://server8.mp3quran.net/afs/001.mp3'));
  assert.ok(!corsAudio('https://cdn.islamic.network/quran/audio-surah/128/alafasy/1.mp3'));
  assert.ok(!corsAudio(''));
  assert.ok(!corsAudio(null));
});

test('serverURL upgrades http to https and appends padded surah', () => {
  assert.equal(serverURL(MOSHAF, 1), 'https://server8.mp3quran.net/afs/001.mp3');
  assert.equal(
    serverURL({ server: 'https://server7.mp3quran.net/shur/' }, 114),
    'https://server7.mp3quran.net/shur/114.mp3'
  );
});

test('parseList handles ranges, singles and defaults to 1..114', () => {
  assert.deepEqual(parseList('1-3,7', 114), [1, 2, 3, 7]);
  assert.equal(parseList('', 114).length, 114);
  assert.equal(parseList(null, 60).length, 60);
  assert.deepEqual(parseList('999,0,-2', 114), [1, 2]);
  assert.deepEqual(parseList('115-200', 114), []);
});

test('buildSources always includes MP3Quran primary source', () => {
  const src = buildSources('مشاري راشد العفاسي', 'Mishary Rashid Alafasy', MOSHAF, 1, []);
  assert.equal(src.length, 1);
  assert.equal(src[0].provider, 'MP3Quran');
  assert.equal(src[0].url, 'https://server8.mp3quran.net/afs/001.mp3');
});

test('buildSources adds Islamic Network fallback for Hafs reciters when editions exist', () => {
  const editions = [
    { identifier: 'alafasy', bitrate: 128 },
    { identifier: 'alafasy', bitrate: 64 }
  ];
  const src = buildSources('مشاري راشد العفاسي', 'Mishary Rashid Alafasy', MOSHAF, 5, editions);
  assert.equal(src.length, 2);
  assert.equal(src[1].provider, 'Islamic Network');
  assert.equal(src[1].bitrate, 128);
  assert.ok(src[1].url.includes('/audio-surah/128/alafasy/5.mp3'));
});

test('buildSources skips fallback for non-Hafs reciters', () => {
  const warsh = { server: 'https://server8.mp3quran.net/afs/', rewaya: 'ورش عن نافع', name: 'مرتل' };
  const src = buildSources('قارئ ورش', 'Warsh Reciter', warsh, 2, [{ identifier: 'alafasy', bitrate: 128 }]);
  assert.equal(src.length, 1);
});

test('buildSources prefers mujawwad edition only for mujawwad moshaf', () => {
  const mujawwad = { server: 'https://server7.mp3quran.net/basit/', rewaya: 'حفص عن عاصم', name: 'مجود' };
  const editions = [
    { identifier: 'abdulbasit', bitrate: 128 },
    { identifier: 'abdulbasit-mujawwad', bitrate: 64 }
  ];
  const src = buildSources('عبد الباسط عبد الصمد', 'Abdul Basit', mujawwad, 1, editions);
  assert.equal(src[1].ed, 'abdulbasit-mujawwad');
  const murattal = { server: 'https://server7.mp3quran.net/basit/', rewaya: 'حفص عن عاصم', name: 'مرتل' };
  const src2 = buildSources('عبد الباسط عبد الصمد', 'Abdul Basit', murattal, 1, editions);
  assert.equal(src2[1].ed, 'abdulbasit');
});

test('pickSource sorts by quality setting', () => {
  const track = {
    sources: [
      { provider: 'A', url: 'a', bitrate: 64 },
      { provider: 'B', url: 'b', bitrate: 128 },
      { provider: 'C', url: 'c', bitrate: 320 }
    ]
  };
  assert.equal(pickSource(track, 'high')[0].bitrate, 320);
  assert.equal(pickSource(track, 'save')[0].bitrate, 64);
  assert.equal(pickSource(track, 'std')[0].bitrate, 128);
  assert.equal(pickSource(track, 'auto')[0].bitrate, 320);
  const sorted = pickSource(track, 'high');
  assert.ok(sorted[0].bitrate >= sorted[1].bitrate && sorted[1].bitrate >= sorted[2].bitrate);
});
