import assert from 'node:assert/strict';
import test from 'node:test';

import { isPlainEmail, resolveLinkTarget } from '../../app/lib/link-target.ts';

test('почта — только адрес без пути', () => {
  assert.equal(isPlainEmail('user@mail.com'), true);
  assert.equal(isPlainEmail('t.me/@zypocc'), false);
  assert.equal(isPlainEmail('https://x.com/@a'), false);
  assert.equal(isPlainEmail('@zypocc'), false);
});

test('t.me/@zypocc — веб-ссылка, а не mailto', () => {
  assert.deepEqual(resolveLinkTarget('t.me/@zypocc'), { type: 'web', url: 'https://t.me/@zypocc' });
  assert.deepEqual(resolveLinkTarget('https://t.me/@zypocc'), { type: 'web', url: 'https://t.me/@zypocc' });
});

test('настоящий mailto остаётся почтой', () => {
  assert.deepEqual(resolveLinkTarget('mailto:contact@zypo.cc'), { type: 'mail', email: 'contact@zypo.cc' });
});

test('ранее испорченный mailto:t.me/@zypocc чинится в веб-ссылку', () => {
  assert.deepEqual(resolveLinkTarget('mailto:t.me/@zypocc'), { type: 'web', url: 'https://t.me/@zypocc' });
});
