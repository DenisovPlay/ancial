import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let iconSpriteMarkup: string | null = null;

function getIconSpriteMarkup() {
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
      className="hidden"
    />
  );
}
