import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const messagesSource = readFileSync(new URL('../messages-content.tsx', import.meta.url), 'utf8');
const sharedSource = readFileSync(new URL('../lib/messages-shared.tsx', import.meta.url), 'utf8');

assert.match(sharedSource, /community_link\?: string \| null/, 'dialog metadata must type the community handle');
assert.match(messagesSource, /selectedDialog\?\.community_link/, 'linked group chats must conditionally render a community action');
assert.match(messagesSource, /lang\?\.open_community/, 'the community action must be localized');
assert.match(messagesSource, /router\.push\(`\/group\/\$\{encodeURIComponent\(communityLink\)\}`\)/, 'the action must navigate to the linked community');

console.log('community dialog menu: ok');
