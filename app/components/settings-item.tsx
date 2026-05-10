import Link from 'next/link';

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
      className={`border border-zinc-600/30 bg-zinc-800/50 p-1 rounded-full flex items-center gap-1.5 w-full duration-300 ${
        href || onClick ? 'hover:bg-zinc-700/60 active:scale-95 cursor-pointer group' : ''
      }`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBgClass}`}>
        {icon}
      </div>
      <span className="text-lg flex-grow">{title}</span>
      {rightContent ? (
        rightContent
      ) : (href || onClick) ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6 fill-zinc-500 mr-1.5 group-hover:fill-zinc-600 duration-300"
          viewBox="0 0 48 48"
        >
          <use href={`#IC-chevron-right`}></use>
        </svg>
      ) : null}
    </div>
  );

  if (href) {
    return <Link href={href} className="w-full">{content}</Link>;
  }

  return content;
}
