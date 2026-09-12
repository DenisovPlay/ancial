/**
 * Склейка условных CSS-классов — раньше была продублирована (побайтово идентично)
 * в 12 файлах: pulse-components/pulse-image/player-utils/pulse-lyrics,
 * posts-renderer/navigation/main-content/modal, editor-shared, messages-shared,
 * post-content, apps-content.
 */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}
