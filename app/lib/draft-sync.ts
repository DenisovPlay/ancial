/** Логика согласования черновика между устройством и сервером (last-write-wins по времени правки). */

export interface DraftRecord {
  /** JSON; пустая строка — черновик удалён. */
  payload: string;
  /** Время правки на устройстве, мс. */
  ts: number;
}

/** Метка времени новой правки: строго больше предыдущей, даже если часы шагнули назад. */
export function nextDraftTs(now: number, previousTs: number): number {
  return Math.max(now, previousTs + 1);
}

export interface DraftResolution {
  /** Что показывать; null — черновика нет. */
  draft: DraftRecord | null;
  /** Локальная копия новее серверной — её нужно отправить. */
  pushLocal: boolean;
}

export function resolveDraft(local: DraftRecord | null, remote: DraftRecord | null): DraftResolution {
  const visible = (record: DraftRecord | null) => (record && record.payload !== '' ? record : null);
  if (!remote) return { draft: visible(local), pushLocal: Boolean(visible(local)) };
  if (!local) return { draft: visible(remote), pushLocal: false };
  if (local.ts > remote.ts) return { draft: visible(local), pushLocal: true };
  return { draft: visible(remote), pushLocal: false };
}
