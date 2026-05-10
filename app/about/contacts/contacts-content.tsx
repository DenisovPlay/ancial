  "use client"

  import { useAuth } from '../../context/AuthContext';
  import { useRouter } from 'next/navigation';
  import Link from 'next/link';
  

export default function ContactsPage() {
  const router = useRouter();
  const { user, isAuthenticated, lang, updateLang } = useAuth() as any;

  return (
    <div className="flex flex-col jusitify-center items-center gap-3 py-3">
      <div className="w-full max-w-4xl flex items-center">
          <span onClick={() => router.push('/about')} className="cursor-pointer w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 px-3 lg:px-0 cursor-pointer"><svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href={`#IC-chevron-left`}></use></svg> {lang?.contacts} </span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 w-full max-w-4xl items-cente justify-center gap-3 px-3 lg:px-0 duration-300">
          
          <a target="_blank" href="https://t.me/ancialru" className="border border-zinc-600/30 rounded-full p-1 bg-zinc-900 flex items-center hover:bg-zinc-800 duration-300 active:scale-95 cursor-pointer hover:shadow-lg hover:shadow-blue-400/25 gap-1.5">
              <div className="w-14 h-14 flex items-center justify-center bg-zinc-900 bg-center bg-cover rounded-full shadow relative" style={{ backgroundImage: 'url(/img/logos/ancial.png)' }}>
                  <div className="w-5 h-5 absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-blue-400 shadow">
                      <img className="w-3.5 h-3.5" src="/img/socials/tg.png"/>
                  </div>
              </div>
              <div className="flex flex-col">
                  <span className="text-lg font-bold">Ancial</span>
                  <span className="text-zinc-300">@ancialru</span>
              </div>
          </a>
          
          <a target="_blank" href="https://vk.com/ancial" className="border border-zinc-600/30 rounded-full p-1 bg-zinc-900 flex items-center hover:bg-zinc-800 duration-300 active:scale-95 cursor-pointer hover:shadow-lg hover:shadow-blue-400/25 gap-1.5">
              <div className="w-14 h-14 flex items-center justify-center bg-zinc-900 bg-center bg-cover rounded-full shadow relative" style={{ backgroundImage: 'url(/img/logos/ancial.png)' }}>
                  <div className="w-5 h-5 absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-blue-500 shadow">
                      <img className="w-3.5 h-3.5" src="/img/socials/vk.png"/>
                  </div>
              </div>
              <div className="flex flex-col">
                  <span className="text-lg font-bold">Ancial</span>
                  <span className="text-zinc-300">@ancial</span>
              </div>
          </a>

          <a target="_blank" href="https://max.ru/join/uv2IksDpcTpFQ3-AP7jn7rLkLUIFpTv8G6GczqLi7FE" className="relative group border border-zinc-600/30 rounded-full p-1 bg-zinc-900 flex items-center hover:bg-zinc-800 duration-300 active:scale-95 cursor-pointer hover:shadow-lg hover:shadow-blue-400/25 gap-1.5">
              <div className="w-14 h-14 flex items-center justify-center bg-zinc-900 bg-center bg-cover rounded-full shadow relative shrink-0" style={{ backgroundImage: 'url(/img/logos/ancial.png)' }}>
                  <div className="w-5 h-5 absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-purple-700 shadow">
                      <img className="w-3.5 h-3.5" src="/img/socials/max.png"/>
                  </div>
              </div>
              <div className="flex flex-col">
                  <span className="text-lg font-bold">Ancial</span>
                  <span className="text-zinc-300 text-xs">В Max нет тегов, поэтому канал приватный</span>
              </div>
              <div className="w-full h-full opacity-0 group-hover:opacity-100 duration-300 rounded-full bg-zinc-800 flex flex-col items-center justify-center text-center text-sm text-zinc-300 absolute top-0 left-0 p-3">
                  Одумайся, у нас же есть Telegram, зачем тебе Max?
              </div>
          </a>
          
          <a target="_blank" href="https://t.me/ancialen" className="border border-zinc-600/30 rounded-full p-1 bg-zinc-900 flex items-center hover:bg-zinc-800 duration-300 active:scale-95 cursor-pointer hover:shadow-lg hover:shadow-blue-400/25 gap-1.5">
              <div className="w-14 h-14 flex items-center justify-center bg-zinc-900 bg-center bg-cover rounded-full shadow relative" style={{ backgroundImage: 'url(/img/logos/ancial.png)' }}>
                  <div className="w-5 h-5 absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-blue-400 shadow">
                      <img className="w-3.5 h-3.5" src="/img/socials/tg.png"/>
                  </div>
              </div>
              <div className="flex flex-col">
                  <span className="text-lg font-bold">Ancial English</span>
                  <span className="text-zinc-300">@ancialen</span>
              </div>
          </a>
          
          <a target="_blank" href="https://x.com/ancialru" className="border border-zinc-600/30 rounded-full p-1 bg-zinc-900 flex items-center hover:bg-zinc-800 duration-300 active:scale-95 cursor-pointer hover:shadow-lg hover:shadow-blue-400/25 gap-1.5">
              <div className="w-14 h-14 flex items-center justify-center bg-zinc-900 bg-center bg-cover rounded-full shadow relative" style={{ backgroundImage: 'url(/img/logos/ancial.png)' }}>
                  <div className="w-5 h-5 absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-slate-900 shadow">
                      <img className="w-3.5 h-3.5" src="/img/socials/x.png"/>
                  </div>
              </div>
              <div className="flex flex-col">
                  <span className="text-lg font-bold">Ancial</span>
                  <span className="text-zinc-300">@ancialru</span>
              </div>
          </a>
          
          <a target="_blank" href="https://t.me/ancialtoken" className="border border-zinc-600/30 rounded-full p-1 bg-zinc-900 flex items-center hover:bg-zinc-800 duration-300 active:scale-95 cursor-pointer hover:shadow-lg hover:shadow-blue-400/25 gap-1.5">
              <div className="w-14 h-14 flex items-center justify-center bg-zinc-900 bg-center bg-cover rounded-full shadow relative" style={{ backgroundImage: 'url(/img/logos/ANCItoken.png)' }}>
                  <div className="w-5 h-5 absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-blue-400 shadow">
                      <img className="w-3.5 h-3.5" src="/img/socials/tg.png"/>
                  </div>
              </div>
              <div className="flex flex-col">
                  <span className="text-lg font-bold">Ancial Token</span>
                  <span className="text-zinc-300">@ancialtoken</span>
              </div>
          </a>
          
          <a target="_blank" href="https://t.me/zeniflow" className="border border-zinc-600/30 rounded-full p-1 bg-zinc-900 flex items-center hover:bg-zinc-800 duration-300 active:scale-95 cursor-pointer hover:shadow-lg hover:shadow-blue-400/25 gap-1.5">
              <div className="w-14 h-14 flex items-center justify-center bg-zinc-900 bg-center bg-cover rounded-full shadow relative" style={{ backgroundImage: 'url(/img/logos/zeni.png)' }}>
                  <div className="w-5 h-5 absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-blue-400 shadow">
                      <img className="w-3.5 h-3.5" src="/img/socials/tg.png"/>
                  </div>
              </div>
              <div className="flex flex-col">
                  <span className="text-lg font-bold">ZeniFlow</span>
                  <span className="text-zinc-300">@zeniflow</span>
              </div>
          </a>
          
          <a target="_blank" href="https://dzen.ru/znflw" className="border border-zinc-600/30 rounded-full p-1 bg-zinc-900 flex items-center hover:bg-zinc-800 duration-300 active:scale-95 cursor-pointer hover:shadow-lg hover:shadow-blue-400/25 gap-1.5">
              <div className="w-14 h-14 flex items-center justify-center bg-zinc-900 bg-center bg-cover rounded-full shadow relative" style={{ backgroundImage: 'url(/img/logos/zeni.png)' }}>
                  <div className="w-5 h-5 absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-black shadow">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 fill-white" viewBox="0 0 129 129"><use href={`#IC-dzen-logo`}></use></svg>
                  </div>
              </div>
              <div className="flex flex-col">
                  <span className="text-lg font-bold">ZeniFlow</span>
                  <span className="text-zinc-300">@znflw</span>
              </div>
          </a>
          
          <a target="_blank" href="mailto:contact@ancial.ru" className="border border-zinc-600/30 rounded-full p-1 bg-zinc-900 flex items-center hover:bg-zinc-800 duration-300 active:scale-95 cursor-pointer hover:shadow-lg hover:shadow-blue-400/25 gap-1.5">
              <div className="w-14 h-14 flex items-center justify-center bg-zinc-600 rounded-full shadow">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 fill-white" viewBox="0 0 48 48"><use href={`#IC-email`}></use></svg>
              </div>
              <div className="flex flex-col">
                  <span className="text-lg font-bold">{lang?.email}</span>
                  <span className="text-zinc-300">contact@ancial.ru</span>
              </div>
          </a>

      </div>
      
      <div className="lg:hidden"><br/><br/><br/><br/></div>
  </div>    
  );
}
