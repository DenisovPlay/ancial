/**
 * Тексты песен в формате LRC: разбор для плеера, для редактора в Creators и обратная сборка.
 * Строка без тайм-кода — time < 0 (плеер) или null (редактор).
 */

export type LyricsLine = {
  text: string;
  /** Секунды от начала; UNSYNCED_TIME — у текста нет тайм-кодов. */
  time: number;
};

/** Строка редактора: время появляется, когда автор её отметил. */
export type LrcDraftLine = {
  text: string;
  time: number | null;
};

export const UNSYNCED_TIME = -1;

const TIMESTAMP = /^\s*\[(\d+):(\d+(?:\.\d+)?)\]\s?(.*)$/;
/** Служебные теги LRC: [ar:…], [ti:…], [length:…] — не строки песни. */
const META_TAG = /^\s*\[[a-z#]+:.*\]\s*$/i;

function readTimestamp(line: string): { text: string; time: number } | null {
  const match = line.match(TIMESTAMP);
  if (!match) return null;
  return { text: match[3].trim(), time: Number.parseInt(match[1], 10) * 60 + Number.parseFloat(match[2]) };
}

/** Текст песни → строки для плеера. Синхронизированный — по времени и с «♪» до первой строки. */
export function parseLyricsText(value: string): LyricsLine[] {
  if (!value || typeof value !== 'string') return [];

  let cleanValue = value.replace(/^﻿/, '').trim();
  // Старые ответы провайдеров иногда приходили JSON-ом.
  if (cleanValue.startsWith('{')) {
    try {
      const parsed = JSON.parse(cleanValue) as { lyrics?: string; text?: string; lrc?: string };
      cleanValue = parsed.lyrics || parsed.text || parsed.lrc || cleanValue;
    } catch { /* не JSON — обычный текст */ }
  }
  cleanValue = cleanValue.replace(/<br\s*\/?>/gi, '\n');

  const rawLines = cleanValue.split(/\r\n|\n/);
  const synced: LyricsLine[] = [];
  rawLines.forEach((line) => {
    const stamped = readTimestamp(line);
    if (stamped?.text) synced.push(stamped);
  });

  if (synced.length > 0) {
    synced.sort((left, right) => left.time - right.time);
    if (synced[0].time > 0.5) synced.unshift({ text: '♪', time: 0 });
    return synced;
  }

  return rawLines
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !META_TAG.test(line))
    .map((text) => ({ text, time: UNSYNCED_TIME }));
}

export function isSyncedLyrics(lines: LyricsLine[]): boolean {
  return lines.length > 0 && lines[0].time >= 0;
}

/** 83.456 → «01:23.45» (сотые, как в LRC). */
export function formatLrcTime(seconds: number): string {
  const hundredths = Math.max(0, Math.floor(seconds * 100 + 1e-6));
  const minutes = Math.floor(hundredths / 6000);
  const rest = hundredths - minutes * 6000;
  return `${String(minutes).padStart(2, '0')}:${String(Math.floor(rest / 100)).padStart(2, '0')}.${String(rest % 100).padStart(2, '0')}`;
}

/** Текст из поля или .lrc-файла → строки редактора в исходном порядке, пустые и служебные убраны. */
export function parseLrcDraft(value: string): LrcDraftLine[] {
  return value
    .replace(/^﻿/, '')
    .split(/\r\n|\r|\n/)
    .filter((line) => !META_TAG.test(line))
    .map((line) => {
      const stamped = readTimestamp(line);
      return stamped ? { text: stamped.text, time: stamped.time } : { text: line.trim(), time: null };
    })
    .filter((line) => line.text.length > 0);
}

/** Строки редактора → текст для поля: у отмеченных строк тайм-код, у остальных нет. */
export function draftToText(lines: LrcDraftLine[]): string {
  return lines.map((line) => (line.time === null ? line.text : `[${formatLrcTime(line.time)}]${line.text}`)).join('\n');
}

/** Строки редактора → текст для сохранения: LRC, если отмечены все строки, иначе простой текст. */
export function buildLrc(lines: LrcDraftLine[]): string {
  const synced = lines.length > 0 && lines.every((line) => line.time !== null);
  return synced ? draftToText(lines) : lines.map((line) => line.text).join('\n');
}
