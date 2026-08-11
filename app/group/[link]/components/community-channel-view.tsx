import type { CommunityChannel } from '../lib/community-types';

type Props = {
  actionLabel: string;
  channel: CommunityChannel;
  onOpen: () => void;
  typeLabel: string;
};

export default function CommunityChannelView({ actionLabel, channel, onOpen, typeLabel }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900/70 p-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xl text-purple-300">
          {channel.channel_type === 'voice' ? '◖))' : channel.channel_type === 'announcement' ? '◉' : '#'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-zinc-100">{channel.title}</p>
          <p className="text-xs text-zinc-500">{typeLabel}</p>
          {channel.description ? <p className="mt-1 text-sm text-zinc-400">{channel.description}</p> : null}
        </div>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="cursor-pointer rounded-3xl border border-purple-400/30 bg-purple-600 p-2.5 font-semibold text-white duration-300 hover:bg-purple-500 active:scale-95"
      >
        {actionLabel}
      </button>
    </div>
  );
}
