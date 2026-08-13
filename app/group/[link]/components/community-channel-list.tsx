import type { CommunityCategory, CommunityChannel } from '../lib/community-types';
import { shouldShowUncategorizedHeading } from '../lib/community-presentation';
import CommunityChannelIcon from './community-channel-icon';

type Props = {
  categories: CommunityCategory[];
  channels: CommunityChannel[];
  disabled?: boolean;
  onSelect: (channel: CommunityChannel) => void | Promise<void>;
  selectedId: number | null;
  uncategorizedLabel: string;
};

function ChannelButton({
  channel,
  disabled,
  onSelect,
  selected,
}: {
  channel: CommunityChannel;
  disabled: boolean;
  onSelect: (channel: CommunityChannel) => void | Promise<void>;
  selected: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void onSelect(channel)}
      className={`flex w-full cursor-pointer items-center gap-2 rounded-3xl border py-2 text-left duration-300 active:scale-95 hover:px-2 ${selected
        ? 'border-purple-400/40 bg-purple-500/20 text-white'
        : 'border-transparent text-zinc-300 hover:border-zinc-600/30 hover:bg-zinc-800/70'
        } disabled:cursor-wait disabled:opacity-60`}
    >
      <span className="flex w-7 shrink-0 items-center justify-center text-zinc-400">
        <CommunityChannelIcon type={channel.channel_type} />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{channel.title}</span>
      {channel.voice_enabled && channel.members_count > 0 ? (
        <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300">{channel.members_count}</span>
      ) : null}
    </button>
  );
}

export default function CommunityChannelList({ categories, channels, disabled = false, onSelect, selectedId, uncategorizedLabel }: Props) {
  const populatedCategories: Array<{ category: CommunityCategory; channels: CommunityChannel[] }> = [];
  for (const category of categories) {
    const categoryChannels = channels.filter((channel) => channel.category_id === category.id);
    if (categoryChannels.length > 0) {
      populatedCategories.push({ category, channels: categoryChannels });
    }
  }
  const renderedCategoryIds = new Set(populatedCategories.map((entry) => entry.category.id));
  const uncategorizedChannels = channels.filter(
    (channel) => channel.category_id === null || !renderedCategoryIds.has(channel.category_id),
  );
  const categorizedChannelCount = populatedCategories.reduce((total, entry) => total + entry.channels.length, 0);
  const showUncategorizedHeading = shouldShowUncategorizedHeading(categorizedChannelCount, uncategorizedChannels.length);

  return (
    <div className="flex flex-col gap-3">
      {populatedCategories.map(({ category, channels: categoryChannels }) => (
        <section key={category.id} className="flex flex-col gap-1">
          <span className="px-2 text-xs font-bold uppercase tracking-wide text-zinc-500">{category.name}</span>
          {categoryChannels.map((channel) => (
            <ChannelButton key={channel.id} channel={channel} disabled={disabled} onSelect={onSelect} selected={selectedId === channel.id} />
          ))}
        </section>
      ))}
      {uncategorizedChannels.length > 0 ? (
        <section className="flex flex-col gap-1">
          {showUncategorizedHeading ? (
            <span className="px-2 text-xs font-bold uppercase tracking-wide text-zinc-500">{uncategorizedLabel}</span>
          ) : null}
          {uncategorizedChannels.map((channel) => (
            <ChannelButton key={channel.id} channel={channel} disabled={disabled} onSelect={onSelect} selected={selectedId === channel.id} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
