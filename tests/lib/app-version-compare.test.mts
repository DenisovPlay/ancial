import test from 'node:test';
import assert from 'node:assert/strict';

import { compareAppVersions } from './app-version-compare.ts';

test('app versions compare by number parts, then letter suffix', () => {
  assert.ok(compareAppVersions('3.8.2', '3.8.2b') < 0);
  assert.ok(compareAppVersions('3.8.2b', '3.8.2a') > 0);
  assert.ok(compareAppVersions('3.9.0', '3.8.9z') > 0);
  assert.ok(compareAppVersions('3.10.0', '3.9.9') > 0);
  assert.equal(compareAppVersions('3.8.2b', '3.8.2b'), 0);
  assert.equal(compareAppVersions('4', '4.0.0'), 0);
});

test('unparsable versions never block the app', () => {
  assert.equal(compareAppVersions('', '3.8.2'), 0);
  assert.equal(compareAppVersions('3.8.2', 'latest'), 0);
});
