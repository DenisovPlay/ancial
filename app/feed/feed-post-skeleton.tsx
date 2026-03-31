export default function FeedPostSkeleton() {
  return (
    <div className="loading-skeleton border border-zinc-600/30 p-3 duration-300 rounded-3xl bg-zinc-900 flex flex-col w-full shadow gap-1.5">
      <div className="flex items-center gap-1.5">
        <div className="w-10 h-10 rounded-2xl shadow animate-pulse bg-zinc-700"></div>
        <div className="flex flex-col gap-1">
          <span className="bg-zinc-700 animate-pulse rounded-md h-5 w-16"></span>
          <span className="bg-zinc-700 animate-pulse rounded-md h-4 w-12"></span>
        </div>
      </div>
      <div className="bg-zinc-700 animate-pulse h-8 w-32 rounded-md"></div>
      <div className="bg-zinc-700 animate-pulse h-6 w-64 rounded-md"></div>
      <div className="animate-pulse bg-zinc-700 h-5 w-56 rounded-md"></div>
    </div>
  );
}
