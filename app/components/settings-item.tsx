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
          <path d="M 18.484375 2.984375 A 1.50015 1.50015 0 0 0 17.439453 5.5605469 L 35.878906 24 L 17.439453 42.439453 A 1.50015 1.50015 0 1 0 19.560547 44.560547 L 39.060547 25.060547 A 1.50015 1.50015 0 0 0 39.060547 22.939453 L 19.560547 3.4394531 A 1.50015 1.50015 0 0 0 18.484375 2.984375 z" />
        </svg>
      ) : null}
    </div>
  );

  if (href) {
    return <Link href={href} className="w-full">{content}</Link>;
  }

  return content;
}
