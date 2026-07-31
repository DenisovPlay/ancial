'use client';

import React, { useState, useRef } from 'react';
import { Movie, Episode } from '../types';
import { getOptimizedImageUrl } from '../cinema-api';

interface VideoPlayerModalProps {
  playingData: {
    movie: Movie;
    episode?: Episode;
  };
  onClose: () => void;
}

export default function VideoPlayerModal({ playingData, onClose }: VideoPlayerModalProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const [selectedQuality, setSelectedQuality] = useState<string>('4K HDR');
  const playerVideoRef = useRef<HTMLVideoElement | null>(null);

  const handleTimeUpdate = () => {
    if (playerVideoRef.current) {
      const current = playerVideoRef.current.currentTime;
      const duration = playerVideoRef.current.duration || 1;
      setVideoProgress((current / duration) * 100);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value);
    setVideoProgress(newProgress);
    if (playerVideoRef.current && playerVideoRef.current.duration) {
      playerVideoRef.current.currentTime = (newProgress / 100) * playerVideoRef.current.duration;
    }
  };

  const togglePlayPause = () => {
    if (playerVideoRef.current) {
      if (isPlaying) {
        playerVideoRef.current.pause();
        setIsPlaying(false);
      } else {
        playerVideoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none">
      {/* TOP CONTROLS BAR */}
      <div className="absolute top-0 inset-x-0 p-3 bg-gradient-to-b from-black/90 via-black/40 to-transparent z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-3 rounded-full bg-white/10 backdrop-blur-xl hover:bg-white/20 text-white border border-white/20 transition-all active:scale-95 cursor-pointer shadow-lg"
          >
            ←
          </button>
          <div>
            <h3 className="text-base font-bold text-white">
              {playingData.movie.title}
            </h3>
            {playingData.episode && (
              <p className="text-xs text-zinc-400">
                {playingData.episode.episodeNumber}. {playingData.episode.title}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <select
            value={selectedQuality}
            onChange={(e) => setSelectedQuality(e.target.value)}
            className="bg-white/10 backdrop-blur-xl text-white px-3 py-1.5 rounded-full border border-white/20 outline-none cursor-pointer shadow-lg"
          >
            <option value="4K HDR" className="bg-zinc-900">4K HDR</option>
            <option value="1080p" className="bg-zinc-900">1080p FullHD</option>
            <option value="720p" className="bg-zinc-900">720p HD</option>
          </select>
        </div>
      </div>

      {/* VIDEO STAGE */}
      <div
        onClick={togglePlayPause}
        className="relative w-full h-full flex items-center justify-center cursor-pointer group"
      >
        {playingData.movie.videoUrl ? (
          <video
            ref={playerVideoRef}
            src={playingData.movie.videoUrl}
            autoPlay
            onTimeUpdate={handleTimeUpdate}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="relative w-full h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getOptimizedImageUrl(playingData.movie.backdropUrl, '@w700', playingData.movie.id)}
              alt={playingData.movie.title}
              className="w-full h-full object-cover filter brightness-50"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                <svg className="w-12 h-12 fill-white ml-1" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS BAR */}
      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-20 space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="100"
            value={videoProgress}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-rose-500 hover:accent-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlayPause}
              className="p-3 rounded-full bg-white text-black hover:bg-zinc-200 transition-all active:scale-95 cursor-pointer"
            >
              <svg className="w-6 h-6 fill-black" viewBox="0 0 24 24">
                {isPlaying ? (
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                ) : (
                  <path d="M8 5v14l11-7z" />
                )}
              </svg>
            </button>
            <span className="text-xs text-zinc-400 font-mono">
              {Math.floor(videoProgress)}%
            </span>
          </div>

          <button
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen();
              } else {
                document.documentElement.requestFullscreen();
              }
            }}
            className="p-3 rounded-full bg-white/10 backdrop-blur-xl hover:bg-white/20 text-white border border-white/20 cursor-pointer shadow-lg transition-all active:scale-95"
          >
            ⛶
          </button>
        </div>
      </div>
    </div>
  );
}
