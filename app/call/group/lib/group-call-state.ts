export type ParticipantMediaState = {
  cam_enabled: boolean;
  mic_enabled: boolean;
  screen_enabled: boolean;
};

export type GroupCallParticipant = ParticipantMediaState & {
  joined_at?: number;
  user_id: number;
};

export type VoiceSignal = Partial<ParticipantMediaState> & {
  candidate?: RTCIceCandidateInit;
  from_user_id?: number | string;
  kind?: string;
  participants?: unknown[];
  reason?: string;
  room_id?: string | null;
  sdp?: string;
  target_user_id?: number | string;
  user_id?: number | string;
};

export function normalizeParticipant(raw: unknown): GroupCallParticipant | null {
  if (!raw || typeof raw !== 'object') return null;

  const participant = raw as Record<string, unknown>;
  const userId = Number(participant.user_id || 0);
  if (!Number.isInteger(userId) || userId <= 0) return null;

  const joinedAt = Number(participant.joined_at || 0);
  return {
    user_id: userId,
    mic_enabled: Boolean(participant.mic_enabled),
    cam_enabled: Boolean(participant.cam_enabled),
    screen_enabled: Boolean(participant.screen_enabled),
    ...(joinedAt > 0 ? { joined_at: joinedAt } : {}),
  };
}

export function normalizeParticipants(raw: unknown): GroupCallParticipant[] {
  if (!Array.isArray(raw)) return [];

  const byUserId = new Map<number, GroupCallParticipant>();
  raw.forEach((item) => {
    const participant = normalizeParticipant(item);
    if (participant) byUserId.set(participant.user_id, participant);
  });
  return Array.from(byUserId.values()).slice(0, 8);
}

export function updateParticipantMedia(
  participants: GroupCallParticipant[],
  userId: number,
  media: ParticipantMediaState,
): GroupCallParticipant[] {
  return participants.map((participant) => participant.user_id === userId
    ? { ...participant, ...media }
    : participant);
}

export function canFocusParticipant(participant: GroupCallParticipant): boolean {
  return participant.cam_enabled || participant.screen_enabled;
}

export function resolveFocusedParticipantId(
  focusedUserId: number | null,
  participants: GroupCallParticipant[],
): number | null {
  if (focusedUserId === null) return null;
  const participant = participants.find((item) => item.user_id === focusedUserId);
  return participant && canFocusParticipant(participant) ? focusedUserId : null;
}

export function getGroupCallGridClass(count: number): string {
  const normalized = Math.max(1, Math.min(8, Math.floor(count)));
  if (normalized === 1) return 'grid-cols-1';
  if (normalized <= 4) return 'grid-cols-1 sm:grid-cols-2';
  if (normalized <= 6) return 'grid-cols-2 lg:grid-cols-3';
  return 'grid-cols-2 lg:grid-cols-4';
}
