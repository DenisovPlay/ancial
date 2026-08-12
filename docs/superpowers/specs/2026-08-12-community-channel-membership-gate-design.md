# Community Channel Membership Gate

Community roles decide which linked channels a user may discover. Chat membership remains the single source of truth for opening messages, seeing chat participants, leaving a chat, and entering its group call.

When a user opens a community channel, the client calls the existing public-chat join endpoint before navigating. Open channels activate `msg_participants` and navigate immediately. Request channels submit a request and remain on the community page. Invite-only/private channels remain inaccessible unless the user already has a valid invite link. Existing active chat participants navigate without mutation.

`GetDialog.php` and realtime group-call authorization must require an active `msg_participants` record even when community permissions contain `view_channel`, preventing direct URL access from bypassing the join flow. Community permissions continue to control channel discovery and in-channel actions.

For linked group chats, dialog metadata includes the safe community handle. The chat dropdown renders a localized “Open community” action that navigates to `/group/{handle}`. Invite secrets are never exposed by this addition.

Regression coverage must verify the membership gate, join-before-navigation behavior for text and voice channels, request handling, and the community dropdown link.
