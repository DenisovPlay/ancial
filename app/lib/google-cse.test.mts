import assert from 'node:assert/strict';
import test from 'node:test';

import { createGoogleCseSearchController } from './google-cse.ts';

test('executes the current query immediately when the CSE element is available', () => {
  const executed: string[] = [];
  const controller = createGoogleCseSearchController({
    getElement: () => ({
      execute: (query: string) => {
        executed.push(query);
      },
    }),
    setIntervalFn: () => 1,
  });

  controller.syncQuery('cats');

  assert.deepEqual(executed, ['cats']);
});

test('re-runs the latest query when the script becomes ready after mount', () => {
  const executed: string[] = [];
  const controller = createGoogleCseSearchController({
    getElement: () => ({
      execute: (query: string) => {
        executed.push(query);
      },
    }),
    setIntervalFn: () => 1,
  });

  controller.syncQuery('cats');
  controller.notifyScriptReady();

  assert.deepEqual(executed, ['cats', 'cats']);
});

test('stops pending retries when the query is cleared', () => {
  let intervalCallback: (() => void) | null = null;
  let clearedIntervalId: number | null = null;
  const executed: string[] = [];
  const controller = createGoogleCseSearchController({
    clearIntervalFn: (id: number) => {
      clearedIntervalId = id;
    },
    getElement: () => null,
    setIntervalFn: (callback: () => void) => {
      intervalCallback = callback;
      return 7;
    },
  });

  controller.syncQuery('cats');
  controller.syncQuery('');
  intervalCallback?.();

  assert.equal(clearedIntervalId, 7);
  assert.deepEqual(executed, []);
});
