import assert from 'node:assert/strict';
import test from 'node:test';

import { callPreviewText, describeCall, formatCallDuration, parseCallToken } from '../../app/lib/call-message.ts';

test('токен разбирается, обычный текст — нет', () => {
  assert.deepEqual(parseCallToken('call:ended:754:v'), { outcome: 'ended', participants: 0, seconds: 754, video: true });
  assert.equal(parseCallToken('call:group:61:a:5')?.participants, 5);
  assert.equal(parseCallToken('привет'), null);
  assert.equal(parseCallToken('call:missed:x:a'), null);
  assert.equal(parseCallToken(null), null);
});

test('длительность: мм:сс и ч:мм:сс', () => {
  assert.equal(formatCallDuration(754), '12:34');
  assert.equal(formatCallDuration(3725), '1:02:05');
  assert.equal(formatCallDuration(-3), '00:00');
});

test('подписи зависят от того, кто звонил', () => {
  const missed = parseCallToken('call:missed:0:a')!;
  assert.equal(describeCall(missed, false, null).title, 'Пропущенный звонок');
  assert.equal(describeCall(missed, false, null).tone, 'bad');
  assert.equal(describeCall(missed, true, null).title, 'Звонок без ответа');

  const ended = parseCallToken('call:ended:65:v')!;
  assert.equal(describeCall(ended, true, null).title, 'Исходящий звонок');
  assert.equal(describeCall(ended, false, null).icon, 'IC-call-incoming');
  assert.equal(describeCall(ended, true, null).subtitle, '01:05 · видео');

  const group = parseCallToken('call:group:3725:a:4')!;
  assert.equal(describeCall(group, false, null).subtitle, '1:02:05 · Участников: 4');
});

test('словарь приоритетнее русских подписей; превью списка диалогов', () => {
  const declined = parseCallToken('call:declined:0:a')!;
  assert.equal(describeCall(declined, true, { call_msg_declined: 'Call declined' }).title, 'Call declined');
  assert.equal(callPreviewText(parseCallToken('call:ended:90:a')!, false, null), 'Входящий звонок, 01:30');
  assert.equal(callPreviewText(parseCallToken('call:missed:0:a')!, false, null), 'Пропущенный звонок');
});
