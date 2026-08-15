import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const directCallSource = readFileSync(new URL('./[hash]/call-client.tsx', import.meta.url), 'utf8');
const groupCallSource = readFileSync(new URL('./group/[hash]/group-call-client.tsx', import.meta.url), 'utf8');

assert.match(
  directCallSource,
  /data-screen-share-control[\s\S]*?className=\{`[^`]*\bhidden\b[^`]*\bmd:flex\b/,
  'личный звонок должен скрывать кнопку демонстрации экрана на телефонах',
);

assert.match(
  groupCallSource,
  /<CallControlButton[\s\S]*?className="hidden md:flex"[\s\S]*?toggleScreenShare/,
  'групповой звонок должен скрывать кнопку демонстрации экрана на телефонах',
);

console.log('mobile screen-share controls: ok');
