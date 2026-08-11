type MusicWidgetInput = {
  type: 'music';
  track_id?: number | string | null;
  track_name?: string | null;
  artist_name?: string | null;
  track_img?: string | null;
  track_src?: string | null;
  track_genre?: string | null;
  track_explicit?: boolean | number | string | null;
};

type PollWidgetInput = {
  type: 'poll';
  question?: string | null;
  options?: Array<string | null | undefined>;
};

type PostWidgetInput = MusicWidgetInput | PollWidgetInput | Record<string, unknown>;

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function parseExternalTrackRef(trackRef: unknown): { source: string; externalId: string } | null {
  const ref = normalizeText(trackRef);
  if (!ref.startsWith('ext_')) {
    return null;
  }

  const sourceStart = 'ext_'.length;
  const separatorIndex = ref.indexOf('_', sourceStart);
  if (separatorIndex < 0) {
    return null;
  }

  const source = ref.slice(sourceStart, separatorIndex);
  const externalId = ref.slice(separatorIndex + 1);
  if (!source || !externalId) {
    return null;
  }

  return { source, externalId };
}

function isExplicit(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

export function serializePostWidgets(widgets: PostWidgetInput[]): string {
  return JSON.stringify(
    widgets.map((widget) => {
      if (widget.type === 'poll') {
        const pollWidget = widget as PollWidgetInput;
        return {
          type: 'poll',
          question: pollWidget.question,
          options: (pollWidget.options ?? []).filter((option) => normalizeText(option)),
        };
      }

      if (widget.type === 'music') {
        const musicWidget = widget as MusicWidgetInput;
        const trackId = Number.parseInt(String(musicWidget.track_id ?? ''), 10);
        if (Number.isFinite(trackId) && trackId > 0) {
          return { type: 'music', track_id: trackId };
        }

        const external = parseExternalTrackRef(musicWidget.track_id);
        if (external) {
          return {
            type: 'music',
            track_ref: normalizeText(musicWidget.track_id),
            source: external.source,
            external_id: external.externalId,
            title: normalizeText(musicWidget.track_name),
            artist: normalizeText(musicWidget.artist_name),
            img: normalizeText(musicWidget.track_img),
            src: normalizeText(musicWidget.track_src),
            genre: normalizeText(musicWidget.track_genre),
            explicit: isExplicit(musicWidget.track_explicit),
          };
        }
      }

      return widget;
    }),
  );
}
