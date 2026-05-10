/* eslint-disable @next/next/no-img-element */

function SearchIcon() {
  return (
    <svg className="inline h-8 w-8 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <use href="#IC-search" />
    </svg>
  );
}

export default function PulseSearchLoading() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-pink-500/25 via-black to-black pb-64 duration-300 lg:from-black">
      <div className="sticky top-0 flex w-full max-w-screen-2xl items-center gap-3 bg-gradient-to-b from-black via-black/90 to-transparent px-3 pt-3 lg:px-0" style={{ zIndex: 99 }}>
        <div className="shrink-0">
          <img src="/img/branding/pulse.svg" alt="Pulse Logo" className="w-32 shrink-0 sm:w-48" />
        </div>
        <div
          className="flex h-12 w-full items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-900/20 p-1 backdrop-blur-md backdrop-saturate-200"
          style={{ zIndex: 11 }}
        >
          <div className="ml-2 h-4 w-full animate-pulse rounded-full bg-zinc-800" />
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <SearchIcon />
          </div>
        </div>
      </div>

      <div className="relative flex w-full max-w-screen-2xl flex-col gap-3" style={{ zIndex: 19 }}>
        <div className="flex animate-pulse flex-col gap-3 px-3 lg:px-0">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 rounded-2xl">
              <div className="h-16 w-16 shrink-0 rounded-2xl bg-zinc-800" />
              <div className="flex flex-grow flex-col gap-2">
                <div className="h-4 w-2/3 rounded-full bg-zinc-800" />
                <div className="h-3 w-1/3 rounded-full bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
