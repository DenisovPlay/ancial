"use client"

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useDragScroll } from '../hooks/useDragScroll';
import { useScrollPingPong } from '../hooks/useScrollPingPong';

export default function Home() {
    const router = useRouter();
    const { user, isAuthenticated, lang, updateLang } = useAuth() as any;

    const navScrollRef = useDragScroll({ speed: 2 });
    const iconsScrollRef = useDragScroll({ speed: 2 });
    const { containerRef, contentRef } = useScrollPingPong({ duration: 15 });

    return (
        <div className="flex flex-col jusitify-center items-center gap-3 py-3">
            <div className="w-full max-w-3xl flex items-center">
                <span onClick={() => router.push('/settings')} className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 px-3 lg:px-0 cursor-pointer"><svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href={`#IC-chevron-left`}></use></svg>{`${lang?.about || 'О'} Ancial`}</span>
            </div>

            <div className="px-3 lg:px-0 w-full max-w-3xl">
                <div className="border border-zinc-600/30 p-3 bg-blue-500/25 text-blue-500 shadow rounded-3xl flex items-center w-full gap-3">
                    <svg className="w-8 h-8 fill-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href={`#IC-warning`}></use></svg>
                    <span className="text-sm lg:text-base w-full">Документы переехали - теперь они находятся на отдельной странице!</span>
                </div>
            </div>

            <div ref={navScrollRef} className="drag-scroll overflow-x-auto viewport px-3 lg:px-0 w-full max-w-3xl sticky top-0 py-3 -my-3 bg-gradient-to-b from-black via-black/90 to-transparent z-40 flex flex-nowrap gap-3">

                <Link href="/about/legal/" className="text-lg px-3 py-2 cursor-pointer shrink-0 flex items-center justify-center bg-zinc-900/20 border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 hover:bg-zinc-700 active:scale-95 duration-300 rounded-full">
                    {lang?.documents}
                </Link>
                <Link href="/about/guides/" className="text-lg px-3 py-2 cursor-pointer shrink-0 flex items-center justify-center bg-zinc-900/20 border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 hover:bg-zinc-700 active:scale-95 duration-300 rounded-full">
                    {lang?.guides}
                </Link>
                <Link href="/about/contacts" className="text-lg px-3 py-2 cursor-pointer shrink-0 flex items-center justify-center bg-zinc-900/20 border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 hover:bg-zinc-700 active:scale-95 duration-300 rounded-full">
                    {lang?.contacts}
                </Link>

            </div>

            <div className="flex flex-col w-full max-w-3xl">
                <span className="w-full max-w-3xl text-lg text-zinc-300 px-3 lg:px-0">Ancial by ZeniFlow - это уникальный проект, объединяющий в себе множество полезных сервисов.</span>
                <div className="flex items-center gap-3 w-full flex-nowrap overflow-x-auto drag-scroll viewport py-3 px-3 lg:px-0" ref={iconsScrollRef}>
                    <div className="w-14 h-14 rounded-2xl shadow bg-gradient-to-br from-black to-indigo-500 flex items-center justify-center shrink-0">
                        <svg className="w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href={`#IC-feed`}></use></svg>
                    </div>
                    <div className="w-14 h-14 rounded-2xl shadow bg-gradient-to-br from-black to-purple-500 flex items-center justify-center shrink-0">
                        <svg className="inline w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href={`#IC-search`}></use></svg>
                    </div>
                    <div className="w-14 h-14 rounded-2xl shadow bg-gradient-to-br from-black to-blue-500 flex items-center justify-center shrink-0">
                        <svg className="w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href={`#IC-chats`}></use></svg>
                    </div>
                    <div className="w-14 h-14 rounded-2xl shadow bg-gradient-to-br from-black to-amber-500 flex items-center justify-center shrink-0">
                        <svg className="inline w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href={`#IC-play`}></use></svg>
                    </div>
                    <div className="w-14 h-14 rounded-2xl shadow bg-gradient-to-br from-black to-pink-500 flex items-center justify-center shrink-0">
                        <svg className="inline w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href={`#IC-music`}></use></svg>
                    </div>
                    <div className="w-14 h-14 rounded-2xl shadow bg-gradient-to-br from-black to-emerald-500 flex items-center justify-center shrink-0">
                        <svg className="inline w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href={`#IC-wallet`}></use></svg>
                    </div>
                    <div className="w-14 h-14 rounded-2xl shadow bg-gradient-to-br from-black to-cyan-500 flex items-center justify-center shrink-0">
                        <svg className="inline w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href={`#IC-call`}></use></svg>
                    </div>
                    <div className="w-14 h-14 rounded-2xl shadow bg-gradient-to-br from-black to-green-500 flex items-center justify-center shrink-0">
                        <svg className="inline w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href={`#IC-games`}></use></svg>
                    </div>
                    <div className="h-14 rounded-2xl flex items-center justify-center shrink-0">
                        <span className="text-lg text-zinc-300">И другие...</span>
                    </div>
                </div>
                <span className="w-full max-w-3xl text-lg text-zinc-300 px-3 lg:px-0">Лента, Поиск, Чаты, Видео, Музыка, Кошелёк, Звонки и куча других сервисов - всё сделано нами.</span>
            </div>

            <span className="w-full max-w-3xl text-3xl font-extralight px-3 lg:px-0" x-text="lang?.technical_specs"></span>
            <div className="w-full max-w-3xl flex flex-col px-3 lg:px-0">
                <span className="text-xl font-bold text-zinc-100">Внутреннее ПО</span>
                <span className="w-full max-w-3xl text-lg text-zinc-300">ZeniUI v2.3.10</span>
                <span className="w-full max-w-3xl text-lg text-zinc-300">LiteAPI v2.0.9</span>
                <span className="w-full max-w-3xl text-lg text-zinc-300">GG-Connect v3.1</span>
                <span className="text-xl font-bold text-zinc-100 mt-1.5">Стороннее ПО</span>
                <div className="border border-zinc-600/30 p-3 bg-amber-500/25 text-amber-500 shadow rounded-3xl flex items-center w-full gap-3">
                    <svg className="w-8 h-8 fill-amber-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href={`#IC-warning`}></use></svg>
                    <span className="text-sm lg:text-base w-full">Используя Ancial, вы автоматически соглашаетесь с правилами и политиками сторонних сервисов, интегрированных в Ancial.</span>
                </div>
                <span className="w-full max-w-3xl text-lg text-zinc-300"><b className="text-green-400">Icons8</b> - все иконки на сайте</span>
                <span className="w-full max-w-3xl text-lg text-zinc-300"><b className="text-orange-400">GCore</b> - защита от DDOS-атак</span>
                <span className="w-full max-w-3xl text-lg text-zinc-300"><b className="text-red-400">FancyBox v3</b> - модальные окна</span>
                <span className="w-full max-w-3xl text-lg text-zinc-300"><b className="text-blue-400">ImgBB</b> - хостинг картинок</span>
                <span className="w-full max-w-3xl text-lg text-zinc-300"><b className="text-red-400">Yandex</b>, <b className="text-blue-400">Telegram</b> - авторизация/верификация</span>
            </div>

            <span className="w-full max-w-3xl text-xl font-bold px-3 lg:px-0 z-[10]">Технологии</span>
            <div ref={containerRef} className="relative w-full max-w-3xl py-3 px-0 z-[9] -my-6 overflow-hidden">
                {/* Градиентные края */}
                <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none"></div>
                <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none"></div>

                {/* Контент с анимацией */}
                <div ref={contentRef} className="flex items-center gap-6 whitespace-nowrap px-3 lg:px-0">
                    <Image src="/img/branding/next.svg" alt="Next" width={256} height={64} className="invert flex-shrink-0" />
                    <Image src="/img/branding/php.svg" alt="PHP" width={150} height={64} className="invert flex-shrink-0" />
                    <Image src="/img/branding/vercel.svg" alt="Vercel" width={64} height={64} className="flex-shrink-0" />
                    <Image src="/img/branding/tailwindcss.svg" alt="Tailwind CSS" width={64} height={64} className="flex-shrink-0" />
                    <Image src="/img/branding/vk-cloud.svg" alt="VK Cloud" width={256} height={64} className="flex-shrink-0" />
                    <Image src="/img/branding/cloud-ru.svg" alt="Cloud.ru" width={264} height={64} className="flex-shrink-0" />
                    <Image src="/img/branding/mysql.svg" alt="MySQL" width={150} height={64} className="-mt-8 flex-shrink-0" />
                </div>
            </div>

            <span className="w-full max-w-3xl text-3xl font-extralight px-3 lg:px-0" x-text="lang?.history"></span>

            <div className="flex flex-col w-full max-w-3xl px-3 lg:px-0">
                <span className="text-xl font-bold text-white">2018</span>
                <span className="w-full max-w-3xl text-lg text-zinc-300">Наша история началась ещё в далёком 2018 году. Мы придумали себе название <span className="text-purple-500">Ctrl C + Ctrl V</span> и целых 2 сервиса: кошелёк (<span className="text-purple-500">GG-Pay</span>) и каталог игр (<span className="text-purple-500">GG-Katalog</span>) с ценами из различных онлайн и оффлайн сервисов.</span>

                <span className="text-xl font-bold text-white mt-3">2019</span>
                <span className="w-full max-w-3xl text-lg text-zinc-300">После этого, в 2019, нас посетила идея создать простую и удобную социальную сеть. С 2019 по 2020 мы сделали кучу прототипов, тестовых версий, множество раз меняли дизайн.</span>

                <span className="text-xl font-bold text-white mt-3">2020</span>
                <span className="w-full max-w-3xl text-lg text-zinc-300">В 2020 мы придумали финальное название - <span className="text-purple-500">Intex.Uno</span>, сейчас уже звучит не очень, правда? ;) В этой версии мы добавили наш кошелёк в качестве приложения, придумали универсальный сервис авторизации и в <span className="text-purple-500">Intex</span>, и в <span className="text-purple-500">GG-Pay</span>. Такую авторизацию, к слову, мы используем и до сих пор, разве что усилили её безопасность в разы.</span>

                <span className="text-xl font-bold text-white mt-3">2021</span>
                <span className="w-full max-w-3xl text-lg text-zinc-300">НО! Самый ключевой момент - 1 января 2021 года, мы пришли к более знакомому названию - <span className="text-purple-500">AncialNeure</span>, приобрели домен Ancial.ru и начали творить - переделали все интерфейсы, придумали логотип.</span>

                <span className="text-xl font-bold text-white mt-3">2022 - 2024</span>
                <span className="w-full max-w-3xl text-lg text-zinc-300">В 2022-2024 мы меняли интерфейсы, создали сервисы, которые есть сейчас, придумали новый логотип с рукописным "an" и спокойными цветами. Создали подназвание <span className="text-purple-500">"Ancial Group"</span> для тех, кто занимался разработкой именно <span className="text-purple-500">Ancial</span>. Сделали чат с нейросетями (<span className="text-purple-500">Anci</span>) и <span className="text-purple-500">dot-Tell</span> - приватный мессенджер в виде клейких листов. Оба этих сервиса пали жертвой оптимизации расходов, но кто знает, может они вернутся... О, ещё - придумали Ancial Коннект для входа в эти сервисы)</span>

                <span className="text-xl font-bold text-white mt-3">2025</span>
                <span className="w-full max-w-3xl text-lg text-zinc-300">В 2025 запустили в разработку новый отдельный Pulse (Музыка) и Zeni (Финтех). А ещё - <span className="text-purple-500">Ancial Lite</span> - более мощную и более лёгкую версию Ancial на новой кодовой базе, освежили логотип, взяли более яркие и броские цвета. Вместо <span className="text-purple-500">Ctrl C + Ctrl V</span> и <span className="text-purple-500">Ancial Group</span> решили назвать себя проще - <span className="text-purple-500">ZeniFlow</span>, в честь не вышедшего финтех сервиса <span className="text-purple-500">Zeni</span>.</span>

                <span className="text-xl font-bold text-white mt-3">2026</span>
                <span className="w-full max-w-3xl text-lg text-zinc-300">Начали новую эпоху - опубликовались на Product Radar и начали делать React-версию клиента.</span>

                <span className="text-xl font-bold text-white mt-3">Сейчас</span>
                <span className="w-full max-w-3xl text-lg text-zinc-300">Ну вроде как мы живы, если вы это читаете ;)<br />Главное помните, что Ancial - <b className="text-white">больше, чем социальная сеть</b>!</span>

            </div>

            <div className="lg:hidden"><br /><br /><br /><br /></div>
        </div>
    );
}
