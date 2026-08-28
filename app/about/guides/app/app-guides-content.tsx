'use client';

import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';

export default function GuidesPage() {
    const { lang } = useAuth();
    return (
        <div className="flex flex-col jusitify-center items-center gap-3 py-3">
            <div className="w-full max-w-4xl">
                <Link href="/about/guides" className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 px-3 lg:px-0 cursor-pointer"><svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href={`#IC-chevron-left`}></use></svg> {lang?.guides} </Link>
            </div>
            <div className="flex flex-col w-full max-w-4xl pb-64">
                <h1 className="w-full text-2xl text-zinc-100 px-3 lg:px-0 font-bold">Как установить приложение?</h1>
                <span className="w-full text-lg text-zinc-200 px-3 lg:px-0 pt-3">Для начала - определимся что у вас за устройство? Инструкция будет отличаться для iPhone или Android.</span>
                <div className="w-full text-lg text-zinc-200 px-3 lg:px-0 pt-3 flex flex-col">
                    <span>Для <b className="text-blue-500">iPhone</b> путь достаточно прост:</span>
                    <span>1. Откройте Safari.</span>
                    <span>2. Откройте Zypo.cc.</span>
                    <span>3. Нажмите &quot;Поделиться&quot; внизу экрана.</span>
                    <img src="/img/guides/app/ios1.png" alt="iOS Safari Шаг 1" loading="lazy" className="max-w-sm rounded-2xl shadow" />
                    <span>4. Выберите пункт &quot;На экран &quot;Домой&quot;.</span>
                    <img src="/img/guides/app/ios2.png" alt="iOS Safari Шаг 2" loading="lazy" className="max-w-sm rounded-2xl shadow" />
                    <span>ПОЗДРАВЛЯЕМ! Вы только что установили на свой &quot;айфончик&quot; ПРОГРЕССИВНОЕ МОБИЛЬНОЕ ПРИЛОЖЕНИЕ Zypo! Откройте же его!</span>
                </div>
                <div className="w-full text-lg text-zinc-200 px-3 lg:px-0 pt-3 flex flex-col">
                    <span>Для <b className="text-lime-500">Android</b> всё так же:</span>
                    <span>1. Откройте Chrome.</span>
                    <span>2. Откройте Zypo.cc.</span>
                    <span>3. Нажмите &quot;...&quot; рядом с адресной строкой.</span>
                    <img src="/img/guides/app/android1.png" alt="Android Chrome Шаг 1" loading="lazy" className="max-w-sm rounded-2xl shadow" />
                    <span>4. Выберите пункт &quot;Добавить на гл. экран&quot;.</span>
                    <img src="/img/guides/app/android2.png" alt="Android Chrome Шаг 2" loading="lazy" className="max-w-sm rounded-2xl shadow" />
                    <span>ПОЗДРАВЛЯЕМ! Вы успешно установили Zypo! Откройте же его!</span>
                </div>
            </div>
        </div>
    );
}
