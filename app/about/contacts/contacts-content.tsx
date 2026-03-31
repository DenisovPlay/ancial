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
          <span onClick={() => router.push('/about')} className="cursor-pointer w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 px-3 lg:px-0 cursor-pointer"><svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href={`/icons.svg#IC-chevron-left`}></use></svg> {lang?.contacts} </span>
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
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 fill-white" viewBox="0 0 129 129"><path xmlns="http://www.w3.org/2000/svg" d="M128.389 62.7804C128.389 62.1406 127.869 61.6108 127.229 61.5808C104.266 60.7111 90.2906 57.782 80.5136 48.0051C70.7167 38.2081 67.7976 24.2225 66.9279 1.20969C66.9079 0.569886 66.3781 0.0500488 65.7283 0.0500488H63.0491C62.4093 0.0500488 61.8795 0.569886 61.8495 1.20969C60.9797 24.2125 58.0607 38.2081 48.2637 48.0051C38.4768 57.792 24.5111 60.7111 1.54831 61.5808C0.908509 61.6008 0.388672 62.1306 0.388672 62.7804V65.4596C0.388672 66.0994 0.908509 66.6292 1.54831 66.6592C24.5111 67.529 38.4868 70.458 48.2637 80.235C58.0407 90.0119 60.9597 103.958 61.8395 126.88C61.8595 127.52 62.3893 128.04 63.0391 128.04H65.7283C66.3681 128.04 66.8979 127.52 66.9279 126.88C67.8076 103.958 70.7267 90.0119 80.5036 80.235C90.2906 70.448 104.256 67.529 127.219 66.6592C127.859 66.6392 128.379 66.1094 128.379 65.4596V62.7804H128.389Z"/></svg>
                  </div>
              </div>
              <div className="flex flex-col">
                  <span className="text-lg font-bold">ZeniFlow</span>
                  <span className="text-zinc-300">@znflw</span>
              </div>
          </a>
          
          <a target="_blank" href="mailto:contact@ancial.ru" className="border border-zinc-600/30 rounded-full p-1 bg-zinc-900 flex items-center hover:bg-zinc-800 duration-300 active:scale-95 cursor-pointer hover:shadow-lg hover:shadow-blue-400/25 gap-1.5">
              <div className="w-14 h-14 flex items-center justify-center bg-zinc-600 rounded-full shadow">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 fill-white" viewBox="0 0 48 48"><path d="M 24 4 C 12.972292 4 4 12.972292 4 24 C 4 35.027708 12.972292 44 24 44 C 26.46846 44 28.839993 43.551537 31.027344 42.730469 A 1.50015 1.50015 0 1 0 29.972656 39.921875 C 28.116007 40.618807 26.10554 41 24 41 C 14.593708 41 7 33.406292 7 24 C 7 14.593708 14.593708 7 24 7 C 33.406292 7 41 14.593708 41 24 L 41 26.5 C 41 29.003499 39.003499 31 36.5 31 C 33.996501 31 32 29.003499 32 26.5 L 32 24 L 32 15.5 A 1.50015 1.50015 0 1 0 29 15.5 L 29 16.566406 C 27.419516 14.984362 25.331498 14 23 14 C 17.942095 14 14 18.59527 14 24 C 14 29.40473 17.942095 34 23 34 C 25.872367 34 28.382558 32.516731 30.017578 30.246094 C 31.319489 32.483151 33.739215 34 36.5 34 C 40.624501 34 44 30.624501 44 26.5 L 44 24 C 44 12.972292 35.027708 4 24 4 z M 23 17 C 26.214095 17 29 20.03073 29 24 C 29 27.96927 26.214095 31 23 31 C 19.785905 31 17 27.96927 17 24 C 17 20.03073 19.785905 17 23 17 z"></path></svg>
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
