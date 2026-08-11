import type { CommunityChannelType } from '../lib/community-types';
import { communityChannelIconId } from '../lib/community-presentation';

type Props = {
  className?: string;
  type: CommunityChannelType;
};

export default function CommunityChannelIcon({ className = 'size-5 fill-current', type }: Props) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <use href={`/icons.svg#${communityChannelIconId(type)}`} />
    </svg>
  );
}
