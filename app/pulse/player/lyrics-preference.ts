export const PULSE_LYRICS_STORAGE_KEY = 'zypo_pulse_lyrics';
export const PULSE_LYRICS_CHANGE_EVENT = 'zypo:pulse-lyrics-change';

type LyricsPreferenceStorage = {
  getItem: (key: string) => string | null;
};

/** Текст включён по умолчанию — выключение хранится как явное 'off'. */
export function readLyricsEnabled(storageValue: LyricsPreferenceStorage = localStorage): boolean {
  try {
    return storageValue.getItem(PULSE_LYRICS_STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setLyricsEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PULSE_LYRICS_STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // best-effort: приватный режим может запрещать запись
  }
  window.dispatchEvent(new Event(PULSE_LYRICS_CHANGE_EVENT));
}

export function subscribeLyricsEnabled(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  const handleStorage = (event: StorageEvent) => {
    if (event.key === PULSE_LYRICS_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener('storage', handleStorage);
  window.addEventListener(PULSE_LYRICS_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(PULSE_LYRICS_CHANGE_EVENT, onStoreChange);
  };
}

// SSR не знает localStorage: стартуем с включённого текста, как и на клиенте по умолчанию.
export const getServerLyricsEnabled = (): boolean => true;
