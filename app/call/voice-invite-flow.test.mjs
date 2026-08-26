import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { isGroupCallOfferer, isPolitePeer } from './group/lib/group-call-state.ts';

// 1. Проверяем, что устаревший отдельный guest-call-client удален
assert.equal(
  existsSync(new URL('./invite/[code]/guest-call-client.tsx', import.meta.url)),
  false,
  'legacy guest-call-client.tsx must be deleted',
);

// 2. Проверяем страницу invite: рендерит CallInviteClient
const invitePageSource = readFileSync(new URL('./invite/[code]/page.tsx', import.meta.url), 'utf8');
assert.match(invitePageSource, /CallInviteClient/);
assert.doesNotMatch(invitePageSource, /GuestCallClient/);

// 3. Проверяем CallInviteClient: только форма ввода имени и переход в /call/group
const inviteClientSource = readFileSync(new URL('./invite/[code]/call-invite-client.tsx', import.meta.url), 'utf8');
assert.match(inviteClientSource, /getVoiceInviteInfo/);
assert.match(inviteClientSource, /\/call\/group\//);
assert.match(inviteClientSource, /guestCode=/);
assert.match(inviteClientSource, /guestName=/);
assert.doesNotMatch(inviteClientSource, /useGroupCall/);
assert.doesNotMatch(inviteClientSource, /RTCPeerConnection/);
assert.doesNotMatch(inviteClientSource, /GuestCallRoom/);

// Дизайн-код Zypo: rounded-3xl для карточки, rounded-full для кнопок/инпутов/аватарок, p-3, border-zinc-600/30
assert.match(inviteClientSource, /rounded-3xl/);
assert.match(inviteClientSource, /rounded-full/);
assert.match(inviteClientSource, /border-zinc-600\/30/);
assert.match(inviteClientSource, /bg-zinc-900/);

// 4. Проверяем group-call-client: поддержка guestCode и guestName
const groupClientSource = readFileSync(new URL('./group/[hash]/group-call-client.tsx', import.meta.url), 'utf8');
assert.match(groupClientSource, /guestCode/);
assert.match(groupClientSource, /guestName/);
assert.match(groupClientSource, /AncialAPI\.getVoiceInviteInfo\(guestCode\)/);
assert.match(groupClientSource, /guestCode: config\.guestCode/);
assert.match(groupClientSource, /guestName: config\.guestName/);

// 5. Проверяем симметрию WebRTC Perfect Negotiation для пользователей и гостей
// User 5 vs User 10
assert.equal(isGroupCallOfferer(5, 10), true);
assert.equal(isGroupCallOfferer(10, 5), false);
assert.equal(isPolitePeer(10, 5), true);
assert.equal(isPolitePeer(5, 10), false);

// Guest -1 vs User 5
assert.equal(isGroupCallOfferer(-1, 5), true);
assert.equal(isGroupCallOfferer(5, -1), false);
assert.equal(isPolitePeer(5, -1), true);
assert.equal(isPolitePeer(-1, 5), false);

// Guest -2 vs Guest -1
assert.equal(isGroupCallOfferer(-2, -1), true);
assert.equal(isGroupCallOfferer(-1, -2), false);
assert.equal(isPolitePeer(-1, -2), true);
assert.equal(isPolitePeer(-2, -1), false);

// 6. Проверяем бэкенд GetVoiceInviteInfo.php на наличие hash
const phpEndpointSource = readFileSync(new URL('../../php-v2-api/backend.ru.zypo/api/V2/calls/GetVoiceInviteInfo.php', import.meta.url), 'utf8');
assert.match(phpEndpointSource, /'hash' => \(string\)\$row\['hash'\]/);

// 7. Проверяем ws-server.php на корректную маршрутизацию сигналов гостям и обновление медиа
const wsServerSource = readFileSync(new URL('../../php-v2-api/backend.ru.zypo/ws-server.php', import.meta.url), 'utf8');
assert.match(wsServerSource, /\$targetUserId === 0 \|\| \$targetUserId === \$userId/);
assert.match(wsServerSource, /\$room\['participants'\]\[\$userId\]\['cam'\] = \$mediaState\['cam_enabled'\]/);
assert.match(wsServerSource, /\$dialogId <= 0 \|\| \$userId === 0/);

// 8. Проверяем Moderation.php на поддержку кика гостей
const moderationSource = readFileSync(new URL('../../php-v2-api/backend.ru.zypo/api/V2/communities/Moderation.php', import.meta.url), 'utf8');
assert.match(moderationSource, /\$targetUserId === 0\)\s*throw new InvalidArgumentException/);
assert.match(moderationSource, /zypo_community_disconnect_voice\(\$dialogId, \$targetUserId\)/);

// 9. Проверяем исправление маршрутизации сигналов через гостевой WS (dialog_id в обёртке)
const hookSource = readFileSync(new URL('./group/[hash]/use-group-call.ts', import.meta.url), 'utf8');
assert.match(hookSource, /dialog_id: msg\.dialog_id, data: msg\.data/);

// 10. Проверяем устранение дублирования гостя при переподключении (evict ghost)
assert.match(wsServerSource, /guestInviteCode/);
assert.match(wsServerSource, /ghostConns/);

console.log('voice invite flow test: ok');
