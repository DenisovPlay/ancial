export interface CinemaEpisodePosition {
  time: number;
  duration: number;
  updatedAt: number;
}

export interface CinemaProgressState {
  season?: number;
  episode?: number;
  translationId?: number | null;
  translationTitle?: string;
  playerId?: string;
  playerName?: string;
  time?: number;
  currentTime?: number;
  duration?: number;
  updatedAt?: number;
  positions?: Record<string, CinemaEpisodePosition>;
}

export interface CinemaProgressUpdate {
  type?: string;
  isEpisodic?: boolean;
  season?: number;
  episode?: number;
  translationId?: number | null;
  translationTitle?: string;
  playerId?: string;
  playerName?: string;
  time?: number;
  currentTime?: number;
  durationSeconds?: number;
  preserveActiveSelection?: boolean;
}

export function normalizeCinemaProgressState<T extends CinemaProgressState>(progress: T): T & {
  time: number;
  currentTime: number;
} {
  const normalizedTime = Number(progress.time ?? progress.currentTime ?? 0);
  return {
    ...progress,
    time: normalizedTime,
    currentTime: normalizedTime,
  };
}

export function selectCinemaProgressState<T extends CinemaProgressState>(
  progress: T,
  isEpisodic: boolean,
  season = 1,
  episode = 1,
): T & { time: number; currentTime: number; duration: number } {
  const slot = progress.positions?.[getPlaybackSlotKey(isEpisodic, season, episode)];
  const canUseLegacy = !progress.positions || Object.keys(progress.positions).length === 0;
  const selectionMatchesLegacy =
    Number(progress.season || 1) === season && Number(progress.episode || 1) === episode;
  const time = slot?.time ?? (canUseLegacy && selectionMatchesLegacy
    ? Number(progress.time ?? progress.currentTime ?? 0)
    : 0);
  const duration = slot?.duration ?? (canUseLegacy && selectionMatchesLegacy ? Number(progress.duration || 0) : 0);
  return { ...progress, season, episode, time, currentTime: time, duration };
}

export function isSeriesProgress(type?: string): boolean {
  const normalizedType = type?.toLowerCase() || '';
  if (!normalizedType) return false;
  return normalizedType !== 'movie' && normalizedType !== 'cartoons';
}

export function getPlaybackSlotKey(isSeries: boolean, season = 1, episode = 1): string {
  return isSeries ? `s${season}:e${episode}` : 'movie';
}

function getLegacyPosition(progress: CinemaProgressState): CinemaEpisodePosition | null {
  const time = Number(progress.time ?? progress.currentTime ?? 0);
  if (time <= 0) return null;
  return {
    time: Math.floor(time),
    duration: Math.floor(Number(progress.duration || 0)),
    updatedAt: Number(progress.updatedAt || 0),
  };
}

export function normalizeCinemaPositions(
  progress: CinemaProgressState,
  isSeries: boolean,
): Record<string, CinemaEpisodePosition> {
  const positions = { ...(progress.positions || {}) };
  const legacy = getLegacyPosition(progress);
  const legacyKey = getPlaybackSlotKey(isSeries, progress.season || 1, progress.episode || 1);
  const hasOnlyLegacyMovieSlot = isSeries && Boolean(positions.movie) &&
    !Object.keys(positions).some((key) => key.startsWith('s'));
  if (legacy && !positions[legacyKey] && !hasOnlyLegacyMovieSlot) positions[legacyKey] = legacy;
  return positions;
}

export function mergeCinemaProgress(
  existing: CinemaProgressState,
  update: CinemaProgressUpdate,
  now = Date.now(),
): CinemaProgressState & { positions: Record<string, CinemaEpisodePosition> } {
  const isSeries = update.isEpisodic === true || isSeriesProgress(update.type) || (
    update.type === undefined && (
      isSeriesProgress((existing as CinemaProgressState & { type?: string }).type) ||
      Boolean(existing.positions && Object.keys(existing.positions).some((key) => key.startsWith('s')))
    )
  );
  const targetSeason = update.season ?? existing.season ?? 1;
  const targetEpisode = update.episode ?? existing.episode ?? 1;
  const season = update.preserveActiveSelection ? (existing.season ?? targetSeason) : targetSeason;
  const episode = update.preserveActiveSelection ? (existing.episode ?? targetEpisode) : targetEpisode;
  const positions = normalizeCinemaPositions(existing, isSeries);
  const slotKey = getPlaybackSlotKey(isSeries, targetSeason, targetEpisode);
  const incomingTime = update.time ?? update.currentTime;

  if (incomingTime !== undefined && incomingTime >= 0) {
    positions[slotKey] = {
      time: Math.floor(incomingTime),
      duration: Math.floor(update.durationSeconds ?? positions[slotKey]?.duration ?? 0),
      updatedAt: now,
    };
  }

  const activePosition = positions[getPlaybackSlotKey(isSeries, season, episode)];
  const activeTime = activePosition?.time ?? 0;
  const activeDuration = activePosition?.duration ?? 0;
  const preserveSelection = update.preserveActiveSelection === true;

  return {
    ...existing,
    season,
    episode,
    translationId: preserveSelection
      ? existing.translationId
      : (update.translationId !== undefined ? update.translationId : existing.translationId),
    translationTitle: preserveSelection
      ? existing.translationTitle
      : (update.translationTitle !== undefined ? update.translationTitle : existing.translationTitle),
    playerId: preserveSelection ? existing.playerId : (update.playerId ?? existing.playerId),
    playerName: preserveSelection ? existing.playerName : (update.playerName ?? existing.playerName),
    time: activeTime,
    currentTime: activeTime,
    duration: activeDuration,
    updatedAt: now,
    positions,
  };
}

export function resolveResumeTime(
  explicitStartTime: number | undefined,
  progress: CinemaProgressState | null,
  isSeries: boolean,
  season = 1,
  episode = 1,
): number {
  if (progress) {
    const positions = normalizeCinemaPositions(progress, isSeries);
    const savedTime = positions[getPlaybackSlotKey(isSeries, season, episode)]?.time || 0;
    if (savedTime > 5) return savedTime;
  }
  return explicitStartTime !== undefined && Number.isFinite(explicitStartTime) && explicitStartTime > 5
    ? explicitStartTime
    : 0;
}

export function isLikelyCinemaContentDuration(duration: number): boolean {
  return Number.isFinite(duration) && duration >= 3 * 60;
}

function toFinitePlaybackNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function parseFlixPlaybackPayload(payload: unknown): {
  time?: number;
  duration?: number;
} {
  if (!payload || typeof payload !== 'object') return {};
  const root = payload as Record<string, unknown>;
  const nested = root.data && typeof root.data === 'object'
    ? root.data as Record<string, unknown>
    : {};
  const time = toFinitePlaybackNumber(
    root.time ?? root.currentTime ?? root.position ?? nested.time ?? nested.currentTime ?? nested.position,
  );
  const duration = toFinitePlaybackNumber(
    root.duration ?? root.totalTime ?? root.total ?? nested.duration ?? nested.totalTime ?? nested.total,
  );
  return { time, duration };
}
