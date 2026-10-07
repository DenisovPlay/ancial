import assert from 'node:assert/strict';
import test from 'node:test';

import { createEntryStore, type StorageLike } from '../../app/lib/entry-store.ts';

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

test('состояние живёт по ключу записи и пространству имён', () => {
  const store = createEntryStore(memoryStorage());
  store.write('scroll', 'a', { y: 10 });
  store.write('draft', 'a', 'текст');
  store.write('scroll', 'b', { y: 99 });
  assert.deepEqual(store.read('scroll', 'a'), { y: 10 });
  assert.equal(store.read('draft', 'a'), 'текст');
  assert.deepEqual(store.read('scroll', 'b'), { y: 99 });
  assert.equal(store.read('scroll', 'c'), undefined);
});

test('после flush состояние читается новым хранилищем (перезагрузка)', () => {
  const storage = memoryStorage();
  const first = createEntryStore(storage);
  first.write('scroll', 'a', { y: 5 });
  first.flush();
  assert.deepEqual(createEntryStore(storage).read('scroll', 'a'), { y: 5 });
});

test('старые записи вытесняются по лимиту', () => {
  const storage = memoryStorage();
  const store = createEntryStore(storage, { max: 2 });
  store.write('n', 'a', 1);
  store.write('n', 'b', 2);
  store.flush();
  store.write('n', 'c', 3);
  store.flush();
  assert.equal(store.read('n', 'a'), undefined);
  assert.equal(storage.data.has('zypo:entry:a'), false);
  assert.equal(store.read('n', 'b'), 2);
  assert.equal(store.read('n', 'c'), 3);
});

test('clear и clearNamespace убирают только своё', () => {
  const storage = memoryStorage();
  const store = createEntryStore(storage);
  store.write('draft', 'a', 'x');
  store.write('scroll', 'a', 1);
  store.write('draft', 'b', 'y');
  store.clear('draft', 'a');
  assert.equal(store.read('draft', 'a'), undefined);
  assert.equal(store.read('scroll', 'a'), 1);
  store.clearNamespace('draft');
  assert.equal(store.read('draft', 'b'), undefined);
  assert.equal(store.read('scroll', 'a'), 1);
});

test('битые данные и переполнение хранилища не ломают работу', () => {
  const storage = memoryStorage();
  storage.data.set('zypo:entry:a', '{oops');
  storage.data.set('zypo:entry:index', 'не json');
  const store = createEntryStore(storage);
  assert.equal(store.read('n', 'a'), undefined);
  const full: StorageLike = { ...storage, setItem: () => { throw new Error('QuotaExceeded'); } };
  const broken = createEntryStore(full);
  broken.write('n', 'a', 1);
  assert.doesNotThrow(() => broken.flush());
  assert.equal(broken.read('n', 'a'), 1);
});
