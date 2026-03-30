'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';

export default function GuidesPage() {
  const router = useRouter();
  const { lang } = useAuth();
  return (
    <div className="flex flex-col jusitify-center items-center gap-3 py-3">
        <div className="w-full max-w-4xl">
            <span onClick={() => router.push("/about/guides/")} className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 px-3 lg:px-0 cursor-pointer"><svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href={`/icons.svg#IC-chevron-left`}></use></svg> {lang?.guides} </span>
        </div>
        <div className="flex flex-col w-full max-w-4xl pb-64">
            <h1 className="w-full text-2xl text-zinc-100 px-3 lg:px-0 font-bold">Как установить приложение?</h1>
            <span className="w-full text-lg text-zinc-200 px-3 lg:px-0 pt-3">Для начала - определимся что у вас за устройство? Инструкция будет отличаться для iPhone или Android.</span>
            <div className="w-full text-lg text-zinc-200 px-3 lg:px-0 pt-3 flex flex-col">
                <span>Для <b className="text-blue-500">iPhone</b> путь достаточно прост:</span>
                <span>1. Откройте Safari.</span>
                <span>2. Откройте Ancial.ru.</span>
                <span>3. Нажмите "Поделиться" внизу экрана.</span>
                <img src="/img/guides/app/ios1.png" loading="lazy" className="max-w-sm rounded-2xl shadow"/>
                <span>4. Выберите пункт "На экран "Домой".</span>
                <img src="/img/guides/app/ios2.png" loading="lazy" className="max-w-sm rounded-2xl shadow"/>
                <span>ПОЗДРАВЛЯЕМ! Вы только что установили на свой "айфончик" ПРОГРЕССИВНОЕ МОБИЛЬНОЕ ПРИЛОЖЕНИЕ Ancial! Откройте же его!</span>
            </div>
            <div className="w-full text-lg text-zinc-200 px-3 lg:px-0 pt-3 flex flex-col">
                <span>Для <b className="text-lime-500">Android</b> всё так же:</span>
                <span>1. Откройте Chrome.</span>
                <span>2. Откройте Ancial.ru.</span>
                <span>3. Нажмите "..." рядом с адресной строкой.</span>
                <img src="/img/guides/app/android1.png" loading="lazy" className="max-w-sm rounded-2xl shadow"/>
                <span>4. Выберите пункт "Добавить на гл. экран".</span>
                <img src="/img/guides/app/android2.png" loading="lazy" className="max-w-sm rounded-2xl shadow"/>
                <span>ПОЗДРАВЛЯЕМ! Вы успешно установили Ancial! Откройте же его!</span>
            </div>
        </div> 
    </div>      
  );
}
