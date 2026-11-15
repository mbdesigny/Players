import test from 'node:test';
import assert from 'node:assert/strict';
import { logError, getErrorLog } from '../src/scripts/lib/telemetry.js';

test('logError buffers error and returns formatted entry', () => {
  const entry = logError(new Error('test failure'), 'unit-test');
  assert.equal(entry.context, 'unit-test');
  assert.equal(entry.message, 'test failure');
  assert.ok(entry.time);
  const log = getErrorLog();
  assert.ok(log.length > 0);
  assert.equal(log[log.length - 1].message, 'test failure');
});

test('logError handles string error gracefully', () => {
  const entry = logError('raw string error', 'string-test');
  assert.equal(entry.message, 'raw string error');
  assert.equal(entry.stack, null);
});
