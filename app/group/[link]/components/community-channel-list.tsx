import type { CommunityCategory, CommunityChannel } from '../lib/community-types';
import CommunityChannelIcon from './community-channel-icon';

type Props = {
  categories: CommunityCategory[];
  channels: CommunityChannel[];
  onSelect: (channel: CommunityChannel) => void;
  selectedId: number | null;
  uncategorizedLabel: string;
};

function ChannelButton({
  channel,
  onSelect,
  selected,
}: {
  channel: CommunityChannel;
  onSelect: (channel: CommunityChannel) => void;
  selected: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(channel)}
      className={`flex w-full cursor-pointer items-center gap-2 rounded-3xl border p-2 text-left duration-300 active:scale-95 ${
        selected
          ? 'border-purple-400/40 bg-purple-500/20 text-white'
          : 'border-transparent text-zinc-300 hover:border-zinc-600/30 hover:bg-zinc-800/70'
      }`}
    >
      <span className="flex w-7 shrink-0 items-center justify-center text-zinc-400">
        <CommunityChannelIcon type={channel.channel_type} />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{channel.title}</span>
      {channel.channel_type === 'voice' && channel.members_count > 0 ? (
        <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300">{channel.members_count}</span>
      ) : null}
    </button>
  );
}

export default function CommunityChannelList({ categories, channels, onSelect, selectedId, uncategorizedLabel }: Props) {
  const renderedCategoryIds = new Set<number>();
  return (
    <div className="flex flex-col gap-3">
      {categories.map((category) => {
        const categoryChannels = channels.filter((channel) => channel.category_id === category.id);
        if (categoryChannels.length === 0) return null;
        renderedCategoryIds.add(category.id);
        return (
          <section key={category.id} className="flex flex-col gap-1">
            <span className="px-2 text-xs font-bold uppercase tracking-wide text-zinc-500">{category.name}</span>
            {categoryChannels.map((channel) => (
              <ChannelButton key={channel.id} channel={channel} onSelect={onSelect} selected={selectedId === channel.id} />
            ))}
          </section>
        );
      })}
      {channels.some((channel) => channel.category_id === null || !renderedCategoryIds.has(channel.category_id)) ? (
        <section className="flex flex-col gap-1">
          <span className="px-2 text-xs font-bold uppercase tracking-wide text-zinc-500">{uncategorizedLabel}</span>
          {channels
            .filter((channel) => channel.category_id === null || !renderedCategoryIds.has(channel.category_id))
            .map((channel) => (
              <ChannelButton key={channel.id} channel={channel} onSelect={onSelect} selected={selectedId === channel.id} />
            ))}
        </section>
      ) : null}
    </div>
  );
}
