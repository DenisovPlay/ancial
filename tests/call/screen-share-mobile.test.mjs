import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const directCallSource = readFileSync(new URL('./[hash]/call-client.tsx', import.meta.url), 'utf8');
const groupCallSource = readFileSync(new URL('./group/[hash]/group-call-client.tsx', import.meta.url), 'utf8');

// Кнопка демонстрации экрана должна быть скрыта на телефонах (видна только md+)
assert.match(
  directCallSource,
  /onClick=\{toggleScreenShare\}[\s\S]{0,400}?className="hidden md:flex"/,
  'личный звонок должен скрывать кнопку демонстрации экрана на телефонах',
);

assert.match(
  groupCallSource,
  /<CallControlButton[\s\S]*?className="hidden md:flex"[\s\S]*?toggleScreenShare/,
  'групповой звонок должен скрывать кнопку демонстрации экрана на телефонах',
);

console.log('mobile screen-share controls: ok');
