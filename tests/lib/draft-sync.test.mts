import assert from 'node:assert/strict';
import test from 'node:test';

import { nextDraftTs, resolveDraft } from './draft-sync.ts';

const rec = (payload: string, ts: number) => ({ payload, ts });

test('метка правки строго растёт, даже если часы ушли назад', () => {
  assert.equal(nextDraftTs(1000, 500), 1000);
  assert.equal(nextDraftTs(1000, 1000), 1001);
  assert.equal(nextDraftTs(900, 1000), 1001);
});

test('серверный черновик новее локального — берём серверный', () => {
  assert.deepEqual(resolveDraft(rec('{"a":1}', 10), rec('{"a":2}', 20)), { draft: rec('{"a":2}', 20), pushLocal: false });
});

test('локальный новее (правили офлайн) — показываем и отправляем его', () => {
  assert.deepEqual(resolveDraft(rec('{"a":1}', 30), rec('{"a":2}', 20)), { draft: rec('{"a":1}', 30), pushLocal: true });
});

test('удаление на другом устройстве (надгробие новее) убирает локальный черновик', () => {
  assert.deepEqual(resolveDraft(rec('{"a":1}', 10), rec('', 20)), { draft: null, pushLocal: false });
});

test('надгробие старее локальной правки не воскрешает удалённое и не мешает новой правке', () => {
  assert.deepEqual(resolveDraft(rec('{"a":1}', 30), rec('', 20)), { draft: rec('{"a":1}', 30), pushLocal: true });
});

test('на сервере ничего нет: локальный черновик показываем и отправляем', () => {
  assert.deepEqual(resolveDraft(rec('{"a":1}', 5), null), { draft: rec('{"a":1}', 5), pushLocal: true });
  assert.deepEqual(resolveDraft(null, null), { draft: null, pushLocal: false });
  assert.deepEqual(resolveDraft(null, rec('{"a":1}', 5)), { draft: rec('{"a":1}', 5), pushLocal: false });
});
