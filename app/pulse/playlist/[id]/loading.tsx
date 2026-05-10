export default function PulsePlaylistLoading() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 pb-0 duration-300 lg:pb-64">
      <div className="sticky top-0 z-20 flex w-full items-center justify-center bg-gradient-to-b from-black via-black/90 to-transparent pt-3">
        <div className="w-full max-w-screen-2xl px-3 lg:px-0">
          <div className="flex w-fit items-center gap-3">
            <svg className="inline h-8 w-8 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <use href="#IC-chevron-left" />
            </svg>
            <img src="/img/branding/pulse.svg" alt="Pulse Logo" className="w-32 shrink-0 sm:w-48" />
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col items-center justify-center gap-3">
        <div className="sticky top-14 flex w-full max-w-screen-2xl flex-col items-center justify-center gap-6 sm:top-16 lg:static lg:top-0 lg:flex-row lg:justify-start">
          <div className="relative flex h-72 w-72 shrink-0 rounded-3xl shadow lg:h-96 lg:w-96">
            <div className="h-full w-full animate-pulse rounded-2xl bg-zinc-800" />
          </div>

          <div className="flex flex-col items-center gap-3 lg:items-start">
            <div className="flex flex-col gap-1.5 text-center lg:text-left">
              <div className="h-14 w-64 animate-pulse rounded-2xl bg-zinc-800" />
              <div className="flex w-full items-center justify-center gap-1 lg:justify-start">
                <span className="h-8 w-8 animate-pulse rounded-full bg-zinc-800" />
                <span className="h-8 w-14 animate-pulse rounded-2xl bg-zinc-800" />
              </div>
            </div>
            <div className="grid w-fit grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <span key={index} className="h-16 w-16 animate-pulse rounded-full bg-zinc-800" />
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-[19] h-full w-full max-w-screen-2xl rounded-3xl rounded-b-none border border-zinc-600/30 bg-zinc-900 duration-300 lg:rounded-b-3xl">
          <div className="flex h-full w-full max-w-screen-2xl flex-col gap-3 p-3 lg:pb-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-2xl bg-zinc-800/60 p-2">
                <span className="h-14 w-14 shrink-0 animate-pulse rounded-2xl bg-zinc-700" />
                <span className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="h-4 w-44 max-w-full animate-pulse rounded-2xl bg-zinc-700" />
                  <span className="h-3 w-28 max-w-full animate-pulse rounded-2xl bg-zinc-700" />
                </span>
                <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-zinc-700" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
