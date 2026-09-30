import {
  getEntryKey,
  initEntryNav,
  isRestoreNavigation,
  onLeaveEntry,
  readEntryState,
  subscribeEntryChange,
  writeEntryState,
} from './entry-nav.ts';

/**
 * Возврат на то же место при «Назад/Вперёд»: позиция прокрутки страницы (с привязкой к посту — картинки
 * ниже дорисовываются и двигают раскладку) и внутренних панелей чатов сохраняется по записи истории.
 */

const NS = 'scroll';
const PANE_IDS = ['dialogs-pane', 'dialog-list-container'];
const ANCHOR_SELECTOR = '[id^="postdiv"]';
const SAVE_DEBOUNCE_MS = 150;
const RESTORE_TICK_MS = 80;
const RESTORE_STABLE_MS = 500;
const RESTORE_GIVE_UP_MS = 3000;

interface ScrollRecord {
  anchor?: { id: string; top: number };
  panes?: Record<string, number>;
  y: number;
}

function pickAnchor(): ScrollRecord['anchor'] {
  const nodes = document.querySelectorAll<HTMLElement>(ANCHOR_SELECTOR);
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.bottom > 1) return { id: node.id, top: Math.round(rect.top) };
  }
  return undefined;
}

function capture(): ScrollRecord {
  const record: ScrollRecord = { y: Math.round(window.scrollY) };
  if (record.y > 0) record.anchor = pickAnchor();
  for (const id of PANE_IDS) {
    const pane = document.getElementById(id);
    if (pane && pane.scrollTop > 0) (record.panes ??= {})[id] = Math.round(pane.scrollTop);
  }
  return record;
}

function resolveTarget(record: ScrollRecord) {
  if (record.anchor) {
    const node = document.getElementById(record.anchor.id);
    if (node) return Math.max(0, Math.round(node.getBoundingClientRect().top + window.scrollY - record.anchor.top));
  }
  return record.y;
}

/** Ставит позиции, до которых страница уже доросла. Возвращает true, если пришлось что-то двигать. */
function applyRecord(record: ScrollRecord) {
  let moved = false;
  const target = resolveTarget(record);
  const maxY = document.documentElement.scrollHeight - window.innerHeight;
  if (target <= maxY + 1 && Math.abs(window.scrollY - target) > 1) {
    window.scrollTo({ top: target, left: 0, behavior: 'instant' });
    moved = true;
  }
  for (const [id, top] of Object.entries(record.panes ?? {})) {
    const pane = document.getElementById(id);
    if (!pane) continue;
    if (pane.scrollHeight - pane.clientHeight >= top - 1 && Math.abs(pane.scrollTop - top) > 1) {
      pane.scrollTop = top;
      moved = true;
    }
  }
  return moved;
}

function isEmptyRecord(record: ScrollRecord) {
  return record.y <= 0 && !record.anchor && !record.panes;
}

/**
 * Подключает сохранение/восстановление прокрутки. Возвращает отписку.
 * Пока идёт восстановление, новые позиции не пишем: иначе пустая страница затёрла бы сохранённое.
 */
export function installScrollRestore() {
  initEntryNav();

  let restoring = false;
  let stopRestore: (() => void) | null = null;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  const save = (key = getEntryKey()) => {
    if (restoring) return;
    writeEntryState(NS, capture(), key);
  };

  const scheduleSave = () => {
    if (restoring || saveTimer !== null) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      save();
    }, SAVE_DEBOUNCE_MS);
  };

  const cancelRestore = () => {
    stopRestore?.();
    stopRestore = null;
    restoring = false;
  };

  const startRestore = (record: ScrollRecord) => {
    cancelRestore();
    if (isEmptyRecord(record)) return;
    restoring = true;

    const startedAt = Date.now();
    let settledSince = 0;
    const step = () => {
      const now = Date.now();
      if (applyRecord(record)) settledSince = now;
      else if (settledSince === 0) settledSince = now;
      if (now - settledSince >= RESTORE_STABLE_MS || now - startedAt >= RESTORE_GIVE_UP_MS) cancelRestore();
    };

    const timer = setInterval(step, RESTORE_TICK_MS);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(step);
    observer?.observe(document.body);
    // Пользователь взялся за прокрутку сам — не мешаем.
    const interrupt = () => cancelRestore();
    const events = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;
    events.forEach((name) => window.addEventListener(name, interrupt, { passive: true }));
    stopRestore = () => {
      clearInterval(timer);
      observer?.disconnect();
      events.forEach((name) => window.removeEventListener(name, interrupt));
    };
    step();
  };

  // Скролл внутренних панелей не всплывает — ловим в фазе перехвата.
  const onScroll = () => scheduleSave();
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });
  const offLeave = onLeaveEntry((key) => {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    save(key);
  });
  const offChange = subscribeEntryChange((change) => {
    if (change.type === 'traverse') {
      startRestore(readEntryState<ScrollRecord>(NS, change.key) ?? { y: 0 });
    } else {
      cancelRestore();
    }
  });

  // Перезагрузка / возврат в закрытую вкладку.
  if (isRestoreNavigation()) {
    const record = readEntryState<ScrollRecord>(NS);
    if (record) startRestore(record);
  }

  return () => {
    cancelRestore();
    if (saveTimer !== null) clearTimeout(saveTimer);
    document.removeEventListener('scroll', onScroll, { capture: true });
    offLeave();
    offChange();
  };
}
