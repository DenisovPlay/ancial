import DOMPurify from 'dompurify';

/**
 * Центральная санитизация пользовательского HTML (посты, комментарии, сообщения).
 *
 * Второй рубеж защиты после серверного htmlspecialchars: даже если какой-то
 * путь записи на бэкенде пропустит неэкранированный HTML (edit, WS, старые
 * записи БД), опасная разметка не дойдёт до dangerouslySetInnerHTML.
 *
 * Профиль рассчитан на вывод parsePostContentToHtml() и message-парсера,
 * поэтому сохраняет всё, что они легитимно генерируют:
 *  - типографику: h2-h4, strong/em/s, sup, br, p, blockquote, span
 *  - списки и таблицы: ul/ol/li, table/tr/th/td
 *  - медиа: img (карусели/коллажи/стикеры)
 *  - ссылки: a (упоминания @user/$group, /redirect-обёртки)
 *  - служебное для редактора: data-bbcode (round-trip блоков), data-action,
 *    data-type (тулбар блоков), contenteditable="false"
 *
 * Что вырезается: script/iframe/object/embed/form/input/button(вне тулбара —
 * button разрешён, т.к. тулбар редактора его использует, но без обработчиков),
 * style-атрибуты, все on*-обработчики (в т.ч. inline onclick каруселей),
 * javascript:/data:-URL в href/src, srcdoc у iframe.
 */

const ALLOWED_TAGS = [
    // типографика и блоки
    'p', 'br', 'hr', 'span', 'div',
    'h2', 'h3', 'h4',
    'strong', 'b', 'em', 'i', 's', 'u', 'sup', 'sub',
    'blockquote',
    // списки
    'ul', 'ol', 'li',
    // таблицы
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    // медиа и ссылки
    'img', 'a',
    // тулбар блоков в редакторе (notion-block-toolbar)
    'button',
    // svg-иконки от API (wfont погоды): svg/use + фигуры внутри
    'svg', 'use', 'path', 'g',
];

const ALLOWED_ATTR = [
    // классы и ссылки
    'class', 'href', 'target', 'rel',
    // изображения
    'src', 'alt', 'width', 'height', 'loading', 'draggable',
    // служебные data-атрибуты рендера и редактора
    'data-user', 'data-group', 'data-author',
    'data-bbcode', 'data-action', 'data-type',
    // стикеры и стрелки карусели
    'data-sticker', 'data-clipboard-text',
    'data-carousel-scroll', 'data-scroll-dir',
    // тулбар редактора и карусели
    'contenteditable', 'title', 'type', 'viewbox', 'd',
];

// Разрешаем http(s), относительные / и якоря. Всё остальное (javascript:,
// data:, vbscript:, file:) DOMPurify вырезает вместе с атрибутом.
const URI_REGEX = /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+?:[^a-z+.-])/i;

let hookInstalled = false;
/** Включается на время одного sanitizeUserHtml(…, { preloadImages: true }) — вызов синхронный. */
let markImages = false;

function installUriGuard(): void {
    if (hookInstalled || typeof window === 'undefined') return;
    hookInstalled = true;
    DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
        if (data.attrName === 'href' || data.attrName === 'src') {
            const value = (data.attrValue || '').trim();
            // Относительные пути и якоря — разрешены
            if (value.startsWith('/') || value.startsWith('#')) return;
            if (value && !URI_REGEX.test(value)) {
                data.keepAttr = false;
            }
        }
    });
    // Картинки в отображаемом HTML получают прелоадер (см. image-loading.ts). Атрибут ставится
    // уже после фильтрации атрибутов, поэтому ALLOW_DATA_ATTR: false его не срезает.
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
        if (!markImages || node.nodeName !== 'IMG') return;
        const element = node as Element;
        // SVG рисуется сразу — прелоадер не нужен (= isSvgSrc из image-loading.ts, литерал из-за node-тестов).
        const src = (element.getAttribute('src') || '').trim().toLowerCase();
        if (src.startsWith('data:image/svg+xml') || /\.svg(?:[?#]|$)/.test(src)) return;
        // = HTML_IMAGE_ATTR из image-loading.ts (литерал: node-тесты не резолвят импорт без расширения).
        element.setAttribute('data-zimg', '');
        element.classList.add('img-skeleton', 'img-loading');
    });
}

/**
 * Санитизирует пользовательский HTML. Единственная точка входа
 * для контента, попадающего в dangerouslySetInnerHTML.
 *
 * preloadImages — только для отображения (лента, пост, сообщения): картинки получают скелетон.
 * В редакторе не включать: служебные классы уехали бы в сохранённый контент.
 */
export function sanitizeUserHtml(html: string, options?: { preloadImages?: boolean }): string {
    if (!html) return '';
    if (typeof window === 'undefined') return html; // SSR: DOMPurify недоступен
    installUriGuard();
    markImages = options?.preloadImages === true;
    try {
        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS,
            ALLOWED_ATTR,
            FORBID_ATTR: ['style', 'srcset', 'srcdoc', 'formaction', 'xlink:href'],
            ALLOW_DATA_ATTR: false,
            KEEP_CONTENT: true,
            RETURN_TRUSTED_TYPE: false,
        });
    } finally {
        markImages = false;
    }
}
