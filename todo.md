- /pulse/search
  fix cache

- /messages
  fix dialogs list cache to act like in /friends, /groups, /pulse/*

- chrome on Android crashes after play any song on /pulse (after update with equalizer)

- fix pageswitch-animation on subpages like /pulse/search and /pulse/my to act like switch from /feed to /messages

- change gap-3 to mr-3 and ml-3 in pulse header (that one with search input in it)

- change tracks dropdown to this layout:
 [Edit] | [Delete] <- two buttons with grid grid-cols-2 and only icons
 [play next] 
 [add to playlist]
 [download]
 [artist page] | [share] | [report]  <- three buttons with grid grid-cols-3 and only icons (when artistpage available, if not - use layout with grid-cols-2)

- add translations (on php-backend) for:
  - [ ] /pulse/playlist
  - [ ] track dropdown
  - [ ] pulse disclaimer 
  - [ ] /messages - stickers
