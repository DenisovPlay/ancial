import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let iconSpriteMarkup: string | null = null;

function getIconSpriteMarkup() {
  if (process.env.NODE_ENV === 'development') {
    return readFileSync(join(process.cwd(), 'public/icons.svg'), 'utf8');
  }
  if (!iconSpriteMarkup) {
    iconSpriteMarkup = readFileSync(join(process.cwd(), 'public/icons.svg'), 'utf8');
  }

  return iconSpriteMarkup;
}

export default function IconSprite() {
  return (
    <div
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: getIconSpriteMarkup() }}
      className="absolute w-0 h-0 overflow-hidden pointer-events-none -z-50 opacity-0"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none', opacity: 0 }}
    />
  );
}
