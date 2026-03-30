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
            <h1 className="w-full text-2xl text-zinc-100 px-3 lg:px-0 font-bold">Как опубликовать песню?</h1>
            
            <span className="w-full text-lg text-zinc-200 px-3 lg:px-0 pt-3">В этом гайде рассмотрим 2 способа публикации песни. Первый - через плейлист "Избранное", второй - через Creators в виде альбома/сингла.</span>
            
            <div className="px-3 pt-3 lg:px-0 w-full max-w-3xl">
                <div className="border border-zinc-600/30 p-3 bg-blue-500/25 text-blue-500 shadow rounded-3xl flex items-center w-full gap-3">
                    <svg className="w-8 h-8 fill-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-warning"></use></svg>
                    <span className="text-sm lg:text-base w-full">Ограничение - <b>10МБ</b> на трек, до 10-ти треков в альбоме.</span>
                </div>
            </div>
            
            <div className="w-full text-lg text-zinc-200 px-3 lg:px-0 pt-3 flex flex-col">
                <span>Начнём с простой загрузки MP3 через "Избранное", трек так же будет доступен для других пользователей и появится в Creators.</span>
                <span>1. Проверьте, есть ли у вас плейлист "Избранное", если нет - добавьте 1 любой трек в избранное с помощью "сердечка", плейлист "Избранное" создастся автоматически.</span>
                <span>2. Перейдите в плейлист "Избранное".</span>
                <span>3. Нажмите кнопку "Добавить" и загрузите MP3 файл.</span>
                <div className="w-full">
                    <img src="/img/guides/publish-song/pulse-add-track1.png" loading="lazy" className="inline w-full max-w-sm rounded-2xl shadow border border-zinc-600/30"/>
                    <img src="/img/guides/publish-song/pulse-add-track2.png" loading="lazy" className="inline w-full max-w-sm rounded-2xl shadow border border-zinc-600/30"/>
                </div>
                <span>4. Трек загружен, добавьте ему название, укажите артиста, загрузите обложку, выберите язык и наличие нецензурной лексики.<br/><b className="text-amber-500">Это желательно сделать, чтобы трек точно перешёл из статуса "Не обработано" в "Доступно".</b><br/><b className="text-red-500">Если вдруг трек не появился - проверьте его в Creators, если он завис - удалите и загрузите снова.</b></span>
                <span>ПОЗДРАВЛЯЕМ! Трек успешно опубликован! Его могут слушать другие пользователи, он автоматически появится в Creators, где вы сможете выбрать жанр или привязать его к артисту, а так же в плейлисте "Новое".</span>
            </div>
            
            <div className="w-full text-lg text-zinc-200 px-3 lg:px-0 pt-3 flex flex-col">
                <span>Теперь рассмотрим <b className="text-lime-500">Creators</b> для публикации альбома:</span>
                <span>1. <span className="text-blue-500 hover:text-blue-600 cursor-pointer active:scale-95 duration-300" onClick={() => router.push("/pulse/my")}>Откройте</span> вашу страницу в Pulse.</span>
                <span>2. Найдите кнопку <span className="text-blue-500 hover:text-blue-600 cursor-pointer active:scale-95 duration-300" onClick={() => router.push("/pulse/create/")}>"Creators"</span> и нажмите на нее.</span>
                <img src="/img/guides/publish-song/pulse-add-track3.png" loading="lazy" className="max-w-sm rounded-2xl shadow border border-zinc-600/30"/>
                <span>3. В верхнем меню выберите "Альбомы" и нажмите на "плюсик".</span>
                <img src="/img/guides/publish-song/pulse-add-track4.png" loading="lazy" className="max-w-sm rounded-2xl shadow border border-zinc-600/30"/>
                <span>4. Заполните данные: название, артист, обложка, язык, наличие нецензурной лексики, жанр.</span>
                <span>5. Загружайте треки по одному, если у MP3-файла есть метаданные - они будут автоматически заполнены.</span>
                <span>6. Проверьте информацию и опубликуйте альбом.</span>
                <span>После загрузки альбома он станет доступен для других пользователей, в разделе "Creators" можно будет привязать его к артисту.</span>
                <span>ПОЗДРАВЛЯЕМ! Вы смогли опубликовать альбом! Вы это сделали!</span>
            </div>
            
        </div> 
    </div>        
  );
}
