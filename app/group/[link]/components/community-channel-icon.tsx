import Icon from '../../../components/svg-icon';
import type { CommunityChannelType } from '../lib/community-types';
import { communityChannelIconId } from '../lib/community-presentation';

type Props = {
  className?: string;
  type: CommunityChannelType;
};

export default function CommunityChannelIcon({ className = 'size-5 fill-current', type }: Props) {
  return <Icon name={communityChannelIconId(type)} className={className} />;
}
