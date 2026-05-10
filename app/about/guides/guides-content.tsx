'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function GuidesPage() {
  const router = useRouter();
  const { lang } = useAuth();
  return (
    <div className="flex flex-col jusitify-center items-center gap-3 py-3">
        <div className="w-full max-w-4xl">
            <span onClick={() => router.push("/about")} className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 px-3 lg:px-0 cursor-pointer"><svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href={`#IC-chevron-left`}></use></svg> {lang?.guides} </span>
        </div>
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 px-3 lg:px-0 pb-64">
            <div onClick={() => router.push("/about/guides/app")} className="bg-zinc-900 hover:bg-zinc-800 rounded-2xl flex flex-col duration-300 active:scale-95 cursor-pointer relative group border border-zinc-600/30">
                <span className="text-sm px-2 py-1 shadow rounded-2xl animate-pulse bg-purple-500/90 backdrop-blur-lg text-white absolute top-1.5 right-1.5">Новое</span>
                <img src="/img/covers/placeholder.png" className="w-full rounded-2xl"/>
                <span className="w-full text-lg font-bold mt-3 px-3 duration-300">Как установить приложение?</span>
                <span className="w-full text-sm text-zinc-300 mb-3 px-3 duration-300">Показываем как быстро установить наше приложение.</span>
            </div>
            <div onClick={() => router.push("/about/guides/publish-song")} className="bg-zinc-900 hover:bg-zinc-800 rounded-2xl flex flex-col duration-300 active:scale-95 cursor-pointer relative group border border-zinc-600/30">
                <span className="text-sm px-2 py-1 shadow rounded-2xl animate-pulse bg-purple-500/90 backdrop-blur-lg text-white absolute top-1.5 right-1.5">Новое</span>
                <img src="/img/covers/placeholder.png" className="w-full rounded-2xl"/>
                <span className="w-full text-lg font-bold mt-3 px-3 duration-300">Как опубликовать песню?</span>
                <span className="w-full text-sm text-zinc-300 mb-3 px-3 duration-300">Показываем как опубликовать свою песню или альбом.</span>
            </div>
        </div>
    </div>    
  );
}
