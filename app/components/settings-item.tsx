import Link from 'next/link';
import Icon from './svg-icon';

interface SettingsItemProps {
  icon: React.ReactNode;
  iconBgClass: string;
  title: string;
  href?: string;
  onClick?: () => void;
  rightContent?: React.ReactNode;
}

export function SettingsItem({
  icon,
  iconBgClass,
  title,
  href,
  onClick,
  rightContent,
}: SettingsItemProps) {
  const content = (
    <div
      onClick={!href ? onClick : undefined}
      className={`p-1.5 flex items-center active:rounded-3xl gap-1.5 w-full duration-300 ${href || onClick ? 'hover:bg-zinc-800/60 active:scale-95 cursor-pointer group' : ''
        }`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBgClass}`}>
        {icon}
      </div>
      <span className="text-lg flex-grow">{title}</span>
      {rightContent ? (
        rightContent
      ) : (href || onClick) ? (
        <Icon name="IC-chevron-right" className="w-6 h-6 fill-zinc-500 mr-1.5 group-hover:fill-zinc-600 duration-300" />
      ) : null}
    </div>
  );

  if (href) {
    return <Link href={href} className="w-full">{content}</Link>;
  }

  return content;
}
