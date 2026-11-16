import test from 'node:test';
import assert from 'node:assert/strict';
import { nextFocusable } from '../src/scripts/lib/focus.js';

const el = (id) => ({ id });

test('nextFocusable cycles forward from every position', () => {
  const list = [el('a'), el('b'), el('c')];
  assert.equal(nextFocusable(list, list[0], 1), list[1]);
  assert.equal(nextFocusable(list, list[1], 1), list[2]);
  assert.equal(nextFocusable(list, list[2], 1), list[0]);
});

test('nextFocusable cycles backward from every position', () => {
  const list = [el('a'), el('b'), el('c')];
  assert.equal(nextFocusable(list, list[2], -1), list[1]);
  assert.equal(nextFocusable(list, list[1], -1), list[0]);
  assert.equal(nextFocusable(list, list[0], -1), list[2]);
});

test('nextFocusable with no element inside the container enters at the correct edge', () => {
  const list = [el('a'), el('b'), el('c')];
  assert.equal(nextFocusable(list, null, 1), list[0]);
  assert.equal(nextFocusable(list, null, -1), list[2]);
});

test('nextFocusable treats an unknown current element as "not inside"', () => {
  const list = [el('a'), el('b')];
  assert.equal(nextFocusable(list, el('zzz'), 1), list[0]);
  assert.equal(nextFocusable(list, el('zzz'), -1), list[1]);
});

test('nextFocusable with a single element keeps cycling on itself', () => {
  const list = [el('only')];
  assert.equal(nextFocusable(list, list[0], 1), list[0]);
  assert.equal(nextFocusable(list, list[0], -1), list[0]);
});

test('nextFocusable returns null for an empty or invalid list', () => {
  assert.equal(nextFocusable([], null, 1), null);
  assert.equal(nextFocusable(null, null, 1), null);
  assert.equal(nextFocusable(undefined, null, -1), null);
});
