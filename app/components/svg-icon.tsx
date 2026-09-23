// Файл не называть icon.tsx: в app/ это зарезервированное имя Next (генератор фавиконки → маршрут /…/icon).
import type { SVGProps } from 'react';

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  /** id символа из public/icons.svg, например `IC-search`. */
  name: string;
};

/**
 * Единственный способ рисовать иконки из спрайта. Спрайт встроен в страницу один раз (IconSprite в layout),
 * поэтому ссылка локальная `#id`, без отдельного запроса /icons.svg. Размер и цвет — классами
 * (`w-5 h-5 fill-white`); viewBox роли не играет: <use> растягивает символ на весь svg.
 */
export default function Icon({ name, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" {...rest}>
      <use href={`#${name}`} />
    </svg>
  );
}
