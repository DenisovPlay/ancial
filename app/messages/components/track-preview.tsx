'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { AncialAPI } from '../../lib/api-v2';
import type { PulseTrack } from '../../pulse/pulse-components';
import { usePulsePlayer } from '../../context/PulsePlayerContext';
import { cn } from '../../pulse/pulse-components';

type TrackPreviewProps = {
  trackId: string | number;
  onLoadSuccess?: () => void;
  className?: string;
};

export default function TrackPreview({ trackId, onLoadSuccess, className }: TrackPreviewProps) {
  const [track, setTrack] = useState<PulseTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { currentSongId, isPlaying, playTrack, togglePlay } = usePulsePlayer();

  useEffect(() => {
    let isMounted = true;

    const cached = localStorage.getItem(`preview_track_${trackId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (isMounted) {
          setTrack(parsed);
          setLoading(false);
          onLoadSuccess?.();
        }
      } catch (e) {
        // ignore
      }
    }

    AncialAPI.getTrack<{ track?: PulseTrack }>(trackId)
      .then((res: any) => {
        if (isMounted) {
          const trackData = res?.track;
          if (trackData && (trackData.sid || trackData.id)) {
            const mapped = {
              ...trackData,
              sid: trackData.sid || trackData.id,
              title: trackData.title || trackData.name,
              artwork: trackData.artwork || (trackData.img ? [{ src: trackData.img }] : [])
            };
            setTrack(mapped);
            localStorage.setItem(`preview_track_${trackId}`, JSON.stringify(mapped));
            if (!cached) {
              onLoadSuccess?.();
            }
          } else {
            if (!cached) setError(true);
          }
        }
      })
      .catch(() => {
        if (isMounted && !cached) setError(true);
      })
      .finally(() => {
        if (isMounted && !cached) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId]);

  const coverSrc = useMemo<string>(() => {
    if (track?.artwork && track.artwork.length > 0) {
      return track.artwork[track.artwork.length - 1].src || '/img/noimg.png';
    }
    return '/img/noimg.png';
  }, [track?.artwork]);

  const isThisTrackPlaying = currentSongId == track?.sid && isPlaying;

  const handlePlayPause = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!track) return;

    if (currentSongId == track.sid) {
      togglePlay();
    } else {
      playTrack(track.sid!);
    }
  };

  if (error) {
    return null;
  }

  if (loading) {
    return (
      <div className={cn("w-[300px] max-w-full rounded-3xl bg-zinc-900/40 border border-zinc-700/30 hover:bg-zinc-800/40 duration-300 flex items-center gap-3 shadow", className)}>
        <div className="w-12 h-12 rounded-3xl bg-zinc-800 shrink-0" />
        <div className="flex flex-col gap-1 w-full">
          <div className="w-24 h-4 rounded bg-zinc-800" />
          <div className="w-16 h-3 rounded bg-zinc-800" />
        </div>
        <div className="w-8 h-8 rounded-full bg-zinc-800 shrink-0 mr-1" />
      </div>
    );
  }

  if (!track) return null;

  return (
    <Link href={`/pulse/track/${track.sid}`} className={cn("w-[300px] max-w-full rounded-3xl bg-zinc-900/40 border border-zinc-700/30 hover:bg-zinc-800/40 duration-300 flex items-center gap-1.5 shadow", className)}>
      <div className="w-10 h-10 rounded-3xl overflow-hidden relative shrink-0">
        <Image
          src={coverSrc}
          alt={track.title || 'Track cover'}
          fill
          className="object-cover"
        />
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-sm font-semibold text-zinc-100 truncate">{track.title}</span>
        <span className="text-xs text-zinc-400 truncate">{track.artist}</span>
      </div>

      <button
        type="button"
        onClick={handlePlayPause}
        className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow shrink-0 mr-1 active:scale-95 duration-300"
      >
        {isThisTrackPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 fill-current" viewBox="0 0 24 24"><use href="/icons.svg#IC-pause"></use></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><use href="/icons.svg#IC-play"></use></svg>
        )}
      </button>
    </Link>
  );
}
