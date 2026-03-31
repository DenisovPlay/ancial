"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./context/AuthContext";

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
        router.push("/");
      }, 3000),
    ];

    return () => timeouts.forEach(clearTimeout);
  }, [router]);

  return (
    <div className="flex min-h-[100vh] w-full flex-col items-center justify-center">
      <span className="error-code">404</span>
      <span className="text-3xl font-bold text-white">{lang?.pagenotfound}</span>
      <span className="text-xl text-zinc-300">{lang?.pagenotfoundredir}</span>
      <span ref={timerRef} className="text-lg text-zinc-400">
        {lang?.pagenotfoundtimer3}
      </span>

      <style>{`
        .error-code {
          font-size: 10rem;
          font-weight: bold;
          color: transparent;
          background: linear-gradient(45deg, #a855f7, #3b82f6);
          -webkit-background-clip: text;
          background-clip: text;
          text-shadow: 0 0 15px rgba(168, 85, 247, 0.5);
          animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
      `}</style>
    </div>
  );
}