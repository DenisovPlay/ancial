"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./context/AuthContext";
import Link from "next/link";

export default function NotFound() {
  const { lang } = useAuth() as any;
  const router = useRouter();
  const timerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const timeouts = [
      setTimeout(() => {
        if (timerRef.current) timerRef.current.textContent = lang?.pagenotfoundtimer2;
      }, 1000),
      setTimeout(() => {
        if (timerRef.current) timerRef.current.textContent = lang?.pagenotfoundtimer1;
      }, 2000),
      setTimeout(() => {
        if (timerRef.current) timerRef.current.textContent = lang?.pagenotfoundredirecting;
      }, 3000),
      setTimeout(() => {
        if (timerRef.current) timerRef.current.textContent = lang?.pagenotfounderror;
      }, 4500),
      setTimeout(() => {
        if (timerRef.current) timerRef.current.textContent = lang?.pagenotfoundwhy;
      }, 6500),
      setTimeout(() => {
        //router.push("/");
      }, 3000),
    ];

    return () => timeouts.forEach(clearTimeout);
  }, [router]);

  return (
    <div className="home-route flex isolate h-[100dvh] max-h-[100dvh] min-h-[100dvh] w-full flex-col items-center justify-center">
      <style jsx global>{`
        @font-face {
          font-family: 'NauryzRedKedsWeather';
          src: url('/fonts/NauryzRedKeds.ttf');
        }

        .cutetext {
          font-family: 'NauryzRedKedsWeather', sans-serif;
          font-style: normal;
          font-weight: 700;
          line-height: 100%;
          margin-top: 0.75rem;
        }
      `}</style>
      <video
        id="videobackground"
        autoPlay
        muted

        preload="none"
        playsInline
        className="z-[1] absolute inset-0 w-full h-full object-cover opacity-50 duration-300"
        src="/img/backgrounds/404.webm"
      />
      <span className="z-10 text-[128px] font-bold cutetext">404</span>
      <span className="z-10 text-3xl font-bold text-white">{lang?.pagenotfound}</span>
      <span className="hidden z-10 text-xl text-zinc-300">{lang?.pagenotfoundredir}</span>
      <span ref={timerRef} className="hidden z-10 text-lg text-zinc-400">
        {lang?.pagenotfoundtimer3}
      </span>
      <Link href="/" className="z-10 px-3 py-2.5 hover:bg-zinc-800 backdrop-blur-md backdrop-hue-200 backdrop-saturate-200 mt-3 border border-zinc-600/30 rounded-3xl duration-300 cursor-pointer active:scale-95">{lang?.gotohome}</Link>
    </div>
  );
}