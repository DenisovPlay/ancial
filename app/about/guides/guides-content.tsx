'use client';

import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import AppImage from '../../components/app-image';
import Icon from '../../components/svg-icon';

export default function GuidesPage() {
  const { lang } = useAuth();
  return (
    <div className="flex flex-col jusitify-center items-center gap-3 py-3">
        <div className="w-full max-w-4xl">
            <Link href="/about" className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 px-3 lg:px-0 cursor-pointer">
              <Icon name="IC-chevron-left" className="w-8 h-8 fill-white inline" />
              {lang?.guides}
            </Link>
        </div>
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 px-3 lg:px-0 pb-64">
            <Link href="/about/guides/app" className="bg-zinc-900 hover:bg-zinc-800 rounded-2xl flex flex-col duration-300 active:scale-95 cursor-pointer relative group border border-zinc-600/30">
                <span className="text-sm px-2 py-1 shadow rounded-2xl animate-pulse bg-purple-500/90 backdrop-blur-lg text-white absolute top-1.5 right-1.5">Новое</span>
                <AppImage width={1920} height={1080} sizes="(max-width: 768px) 100vw, 768px" src="/img/placeholders/cover.png" className="w-full rounded-2xl" alt="Cover" />
                <span className="w-full text-lg font-bold mt-3 px-3 duration-300">Как установить приложение?</span>
                <span className="w-full text-sm text-zinc-300 mb-3 px-3 duration-300">Показываем как быстро установить наше приложение.</span>
            </Link>
            <Link href="/about/guides/publish-song" className="bg-zinc-900 hover:bg-zinc-800 rounded-2xl flex flex-col duration-300 active:scale-95 cursor-pointer relative group border border-zinc-600/30">
                <span className="text-sm px-2 py-1 shadow rounded-2xl animate-pulse bg-purple-500/90 backdrop-blur-lg text-white absolute top-1.5 right-1.5">Новое</span>
                <AppImage width={1920} height={1080} sizes="(max-width: 768px) 100vw, 768px" src="/img/placeholders/cover.png" className="w-full rounded-2xl" alt="Cover" />
                <span className="w-full text-lg font-bold mt-3 px-3 duration-300">Как опубликовать песню?</span>
                <span className="w-full text-sm text-zinc-300 mb-3 px-3 duration-300">Показываем как опубликовать свою песню или альбом.</span>
            </Link>
        </div>
    </div>    
  );
}
