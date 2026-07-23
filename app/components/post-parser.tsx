/**
 * Считает только видимые символы — без BBCode-тегов.
 * Используется для счётчика лимита 3000 символов.
 */
export function getVisibleLength(bbcode: string): number {
    return bbcode.replace(/\[[^\]]+\]/g, '').length;
}

export function parsePostContentToHtml(content: string | null | undefined, isPreview: boolean = false): string {
    if (!content) return '';
    let html = content;

    // Если это превью или редактор, экранируем HTML, так как текст сырой.
    // Если это отрендеренный сервером пост, он УЖЕ экранирован сервером (htmlspecialchars),
    // и сервер УЖЕ добавил туда безопасные HTML-теги для стикеров и упоминаний, поэтому мы не экранируем.
    if (isPreview) {
        html = html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ─── БЛОЧНЫЕ ТЕГИ (обрабатываем первыми) ────────────────────────────────

    // Заголовки — в редакторе используем H2/H3/H4 чтобы htmlToBBCode мог их распознать
    html = html.replace(/\[h1\]([\s\S]*?)\[\/h1\]/gi,
        '<h2 class="text-2xl font-bold text-zinc-100 mt-4 mb-2 leading-tight">$1</h2>');
    html = html.replace(/\[h2\]([\s\S]*?)\[\/h2\]/gi,
        '<h3 class="text-xl font-bold text-zinc-100 mt-3 mb-1.5 leading-tight">$1</h3>');
    html = html.replace(/\[h3\]([\s\S]*?)\[\/h3\]/gi,
        '<h4 class="text-lg font-semibold text-zinc-200 mt-2 mb-1 leading-tight">$1</h4>');

    // Цитата с автором
    html = html.replace(/\[quote=([^\]]{1,100})\]([\s\S]*?)\[\/quote\]/gi, (_, author, inner) => {
        const safeAuthor = author.trim().replace(/"/g, '&quot;');
        return `<blockquote class="border-l-4 border-purple-500 bg-zinc-800/40 rounded-r-2xl pl-3 pr-3 py-2 my-2" data-author="${safeAuthor}"><span class="font-semibold text-zinc-300 text-sm not-italic block mb-1">${safeAuthor}</span><span class="italic text-zinc-400">${inner.trim()}</span></blockquote>`;
    });
    // Цитата без автора
    html = html.replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi,
        '<blockquote class="border-l-4 border-purple-500 bg-zinc-800/40 rounded-r-2xl pl-3 pr-3 py-2 my-2 italic text-zinc-400">$1</blockquote>');

    // Маркированный список — стандартный UL/LI для WYSIWYG-рендера в редакторе
    html = html.replace(/\[ul\]([\s\S]*?)\[\/ul\]/gi, (_, inner) => {
        let items = '';
        const regex = /\[li\]([\s\S]*?)\[\/li\]/gi;
        let match;
        while ((match = regex.exec(inner)) !== null) {
            items += `<li>${match[1]}</li>`;
        }
        return `<ul class="list-disc pl-5 space-y-1 my-2 text-zinc-200">${items}</ul>`;
    });

    // Нумерованный список
    html = html.replace(/\[ol\]([\s\S]*?)\[\/ol\]/gi, (_, inner) => {
        let items = '';
        const regex = /\[li\]([\s\S]*?)\[\/li\]/gi;
        let match;
        while ((match = regex.exec(inner)) !== null) {
            items += `<li>${match[1]}</li>`;
        }
        return `<ol class="list-decimal pl-5 space-y-1 my-2 text-zinc-200">${items}</ol>`;
    });

    // Таблица
    html = html.replace(/\[table\]([\s\S]*?)\[\/table\]/gi, (match, inner) => {
        let rows = '';
        const trRegex = /\[tr\]([\s\S]*?)\[\/tr\]/gi;
        let trMatch;
        while ((trMatch = trRegex.exec(inner)) !== null) {
            let cells = '';
            const cellRegex = /\[(th|td)\]([\s\S]*?)\[\/\1\]/gi;
            let cellMatch;
            while ((cellMatch = cellRegex.exec(trMatch[1])) !== null) {
                const tag = cellMatch[1].toLowerCase();
                const content = cellMatch[2];
                if (tag === 'th') {
                    cells += `<th class="border border-zinc-700/60 px-3 py-1.5 bg-zinc-800 font-semibold text-zinc-200 text-sm text-left h-10 min-h-[2.5rem] min-w-[3.5rem]">${content}</th>`;
                } else {
                    cells += `<td class="border border-zinc-700/60 px-3 py-1.5 text-zinc-300 text-sm h-10 min-h-[2.5rem] min-w-[3.5rem]">${content}</td>`;
                }
            }
            rows += `<tr class="even:bg-zinc-800/30">${cells}</tr>`;
        }

        const overlay = isPreview
            ? `<div class="notion-block-toolbar" contenteditable="false"><button type="button" data-action="edit" data-type="table" class="p-1.5 hover:bg-zinc-800 rounded-3xl text-zinc-300 hover:text-white transition-colors cursor-pointer" title="Редактировать таблицу"><svg class="w-4 h-4 fill-current"><use href="#IC-edit"></use></svg></button><button type="button" data-action="delete" class="p-1.5 hover:bg-zinc-800 rounded-3xl text-zinc-300 hover:text-red-400 transition-colors cursor-pointer" title="Удалить"><svg class="w-4 h-4 fill-current"><use href="#IC-trash"></use></svg></button></div>`
            : '';
        const dataAttr = isPreview ? ` data-bbcode="${encodeURIComponent(match)}" contenteditable="false"` : '';
        return `<div class="relative group overflow-x-auto my-2 rounded-2xl border border-zinc-700/50"${dataAttr}>${overlay}<table class="w-full border-collapse">${rows}</table></div>`;
    });

    // Спойлер — инлайновый Telegram-style
    // В редакторе (isPreview=true): серая подложка без блюра для редактирования
    // В постах (isPreview=false): блюр, снимается кликом через CSS+JS
    html = html.replace(/\[spoiler\]([\s\S]*?)\[\/spoiler\]/gi, (_, body) => {
        const content = body.trim();
        if (isPreview) {
            return `<span class="ancial-spoiler-editor">${content}</span>`;
        }
        return `<span class="ancial-spoiler">${content}</span>`;
    });

    // Обратная совместимость: старые посты с [details=title]body[/details]
    html = html.replace(/\[details=([^\]]{1,200})\]([\s\S]*?)\[\/details\]/gi, (_, _title, body) => {
        const content = body.trim();
        if (isPreview) {
            return `<span class="ancial-spoiler-editor">${content}</span>`;
        }
        return `<span class="ancial-spoiler">${content}</span>`;
    });

    // Сноска
    html = html.replace(/\[fn\]([\s\S]*?)\[\/fn\]/gi, (match, text) => {
        const cleanText = text.replace(/[\u200B\s]/g, '');
        if (!cleanText) return '';
        const safeText = text.trim().replace(/"/g, '&quot;');
        const cursorClass = isPreview ? 'cursor-text' : 'cursor-help';
        return `<sup class="text-purple-400 underline decoration-dotted text-xs ${cursorClass}" title="${safeText}">${text.trim()}</sup>`;
    });

    // Карусель (URL через ||)
    // В редакторе (isPreview=true) сохраняем исходный BBCode в data-атрибуте для round-trip,
    // а элемент делаем contenteditable=false чтобы пользователь не ломал структуру
    html = html.replace(/\[carousel\]([\s\S]*?)\[\/carousel\]/gi, (match, urls) => {
        const items = urls.trim().split('||').map((u: string) => u.trim()).filter(Boolean);
        if (!items.length) return '';
        const count = items.length;
        const countBadgeClass = isPreview ? "carousel-count-badge is-preview" : "carousel-count-badge";

        const countBadge = count > 1
            ? `<div class="${countBadgeClass}"><svg class="w-3.5 h-3.5 fill-current inline-block align-middle" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z"/></svg> ${count}</div>`
            : '';
        const slides = items.map((url: string, i: number) =>
            `<div class="snap-start shrink-0 w-[84%] sm:w-[78%] lg:w-[68%] cursor-pointer duration-300 select-none"><img src="${url}" alt="Слайд ${i + 1}" class="h-64 md:h-96 w-full rounded-3xl object-contain bg-zinc-950/80 shadow border border-zinc-800/40 pointer-events-auto" loading="lazy" draggable="false" /></div>`
        ).join('');

        const leftArrow = count > 1
            ? `<button type="button" onclick="const container = this.parentElement.querySelector('.overflow-x-auto'); container.scrollBy({ left: -container.clientWidth * 0.7, behavior: 'smooth' })" class="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full border border-zinc-600/30 bg-zinc-950/80 hover:bg-zinc-800 text-white shadow backdrop-blur-md opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 active:scale-95 cursor-pointer"><svg class="w-6 h-6 fill-white" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></button>`
            : '';
        const rightArrow = count > 1
            ? `<button type="button" onclick="const container = this.parentElement.querySelector('.overflow-x-auto'); container.scrollBy({ left: container.clientWidth * 0.7, behavior: 'smooth' })" class="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full border border-zinc-600/30 bg-zinc-950/80 hover:bg-zinc-800 text-white shadow backdrop-blur-md opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 active:scale-95 cursor-pointer"><svg class="w-6 h-6 fill-white" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg></button>`
            : '';

        const overlay = isPreview
            ? `<div class="notion-block-toolbar" contenteditable="false"><button type="button" data-action="edit" data-type="media" class="p-1.5 hover:bg-zinc-800 rounded-3xl text-zinc-300 hover:text-white transition-colors cursor-pointer" title="Редактировать карусель"><svg class="w-4 h-4 fill-current"><use href="#IC-edit"></use></svg></button><button type="button" data-action="delete" class="p-1.5 hover:bg-zinc-800 rounded-3xl text-zinc-300 hover:text-red-400 transition-colors cursor-pointer" title="Удалить"><svg class="w-4 h-4 fill-current"><use href="#IC-trash"></use></svg></button></div>`
            : '';
        const dataAttr = isPreview ? ` data-bbcode="${encodeURIComponent(match)}" contenteditable="false"` : '';
        return `<div class="relative group my-2 group/carousel"${dataAttr}>${overlay}${leftArrow}${rightArrow}${countBadge}<div class="flex gap-3 overflow-x-auto overflow-y-hidden touch-pan-y overscroll-x-contain -mx-3 px-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">${slides}</div></div>`;
    });

    // Коллаж (CSS Grid)
    html = html.replace(/\[collage\]([\s\S]*?)\[\/collage\]/gi, (match, urls) => {
        const items = urls.trim().split('||').map((u: string) => u.trim()).filter(Boolean);
        if (!items.length) return '';
        const cols = items.length === 2 ? 'grid-cols-2' : items.length >= 4 ? 'grid-cols-2' : 'grid-cols-3';
        const imgs = items.map((url: string, i: number) => {
            const spanClass = (items.length === 4 && i === 0) ? 'col-span-2' : '';
            return `<img src="${url}" alt="Коллаж ${i + 1}" class="${spanClass} w-full h-40 object-cover rounded-2xl shadow cursor-pointer active:scale-95 duration-300" loading="lazy" draggable="false" />`;
        }).join('');

        const overlay = isPreview
            ? `<div class="notion-block-toolbar" contenteditable="false"><button type="button" data-action="edit" data-type="media" class="p-1.5 hover:bg-zinc-800 rounded-3xl text-zinc-300 hover:text-white transition-colors cursor-pointer" title="Редактировать коллаж"><svg class="w-4 h-4 fill-current"><use href="#IC-edit"></use></svg></button><button type="button" data-action="delete" class="p-1.5 hover:bg-zinc-800 rounded-3xl text-zinc-300 hover:text-red-400 transition-colors cursor-pointer" title="Удалить"><svg class="w-4 h-4 fill-current"><use href="#IC-trash"></use></svg></button></div>`
            : '';
        const dataAttr = isPreview ? ` data-bbcode="${encodeURIComponent(match)}" contenteditable="false"` : '';
        return `<div class="relative group my-2"${dataAttr}>${overlay}<div class="grid ${cols} gap-1.5">${imgs}</div></div>`;
    });

    // ─── ИНЛАЙН-ФОРМАТИРОВАНИЕ ───────────────────────────────────────────────

    // 1. Форматирование текста (BBCode)
    html = html.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>');
    html = html.replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>');
    html = html.replace(/\[s\]([\s\S]*?)\[\/s\]/gi, '<s>$1</s>');

    // 2. Ссылки — кастомные [url|text] и сырые URL
    const linkRegex = /(<[^>]+>)|\[([^\]|]+)\|([^\]]+)\]|((?:https?:\/\/)?(?:[a-zA-Z0-9\-а-яА-ЯёЁ]+\.)+[a-zA-Zа-яА-ЯёЁ]{2,20}(?:\/(?:[^\s<]*[^<.,:;"')\]\s])?)?)/giu;
    html = html.replace(linkRegex, (match, htmlTag, customUrl, customText, rawUrl) => {
        if (htmlTag) {
            return htmlTag;
        }

        if (customUrl && customText) {
            let url = customUrl.trim();
            if (!/^https?:\/\//i.test(url)) {
                url = 'https://' + url;
            }
            return `<a href="https://ancial.ru/redirect?link=${encodeURIComponent(url)}" target="_blank" rel="noopener noreferrer" class="text-purple-500 hover:text-purple-400 duration-300">${customText.trim()}</a>`;
        } else if (rawUrl) {
            let url = rawUrl.trim();

            if (!/^https?:\/\//i.test(url) && /\.(php|html?|js|css|zip|rar|exe|png|jpe?g|gif|mp4|avi)$/i.test(url)) {
                return match;
            }

            let finalUrl = url;
            if (!/^https?:\/\//i.test(finalUrl)) {
                finalUrl = 'https://' + finalUrl;
            }
            return `<a href="https://ancial.ru/redirect?link=${encodeURIComponent(finalUrl)}" target="_blank" rel="noopener noreferrer" class="text-purple-500 hover:text-purple-400 duration-300">${url}</a>`;
        }

        return match;
    });

    // 3. Переносы строк → <br>
    // Сервер (CreatePost.php) делает nl2br перед сохранением, так что в базе часто лежит <br>\n.
    // Если \n идёт сразу после <br>, мы схлопываем их в один <br>, чтобы не было двойных <br><br>.
    html = html.replace(/<br\s*\/?>\r?\n/gi, '<br>');
    // А оставшиеся \n превращаем в <br> (нужно для превью в редакторе, где текст идет без <br>)
    html = html.replace(/\r\n/g, '<br>');
    html = html.replace(/\n/g, '<br>');

    // 4. Очистка лишних <br> вокруг блочных элементов
    // Блочные элементы (h2-h4, списки, цитаты, таблицы, спойлеры) сами по себе переносят строку.
    // Избыточные <br> перед ними или после них создают огромные пустые дыры в тексте.
    html = html.replace(/(?:<br\s*\/?>\s*)+(<\/?(?:h2|h3|h4|blockquote|ul|ol|details|table|div)\b)/gi, '$1');
    html = html.replace(/(<\/?(?:h2|h3|h4|blockquote|ul|ol|details|table|div)\b[^>]*>)\s*(?:<br\s*\/?>\s*)*/gi, '$1');

    // 5. Форматирование упоминаний пользователей (@user) и групп ($group)
    html = formatMentions(html);

    // 6. Если в редакторе документ оканчивается на block-элемент (div карусели/коллажа/таблицы),
    // дописываем пустой параграф <p><br></p> в конец, чтобы курсор не застревал.
    if (isPreview && html.trim().endsWith('</div>')) {
        html += '<p><br></p>';
    }

    return html;
}

export function formatMentions(html: string): string {
    if (!html) return html;

    const MENTION_CLASS = 'active:scale-95 border border-zinc-600/30 text-purple-400 hover:text-purple-300 px-2 py-0.5 rounded-2xl bg-zinc-800/90 hover:bg-zinc-700/80 duration-300 cursor-pointer inline-flex items-center gap-0.5 font-semibold text-sm select-none transition-all';

    const makeUser = (username: string) =>
        `<a href="/@${username}" class="${MENTION_CLASS}" data-user="${username}">@${username}</a>`;

    const makeGroup = (groupname: string) =>
        `<a href="/$${groupname}" class="${MENTION_CLASS}" data-group="${groupname}">$${groupname}</a>`;

    let result = html;

    // 1. [mention=user]username[/mention]  — новый PHP формат
    result = result.replace(/\[mention=user\]([\s\S]*?)\[\/mention\]/gi, (_, val) => {
        const name = val.trim().replace(/^@/, '');
        return makeUser(name);
    });

    // 2. [mention=group]groupname[/mention]  — новый PHP формат
    result = result.replace(/\[mention=group\]([\s\S]*?)\[\/mention\]/gi, (_, val) => {
        const name = val.trim().replace(/^\$/, '');
        return makeGroup(name);
    });

    // 3. Старые BBCode [user=username] / [user=username]label[/user]
    result = result.replace(/\[user=([a-zA-Z0-9_]{2,32})\]([\s\S]*?)\[\/user\]/gi, (_, u) =>
        makeUser(u.replace(/^@/, ''))
    );
    result = result.replace(/\[user=([a-zA-Z0-9_]{2,32})\]/gi, (_, u) =>
        makeUser(u.replace(/^@/, ''))
    );

    // 4. Старые BBCode [group=groupname] / [group=groupname]label[/group]
    result = result.replace(/\[group=([a-zA-Z0-9_]{2,32})\]([\s\S]*?)\[\/group\]/gi, (_, g) =>
        makeGroup(g.replace(/^\$/, ''))
    );
    result = result.replace(/\[group=([a-zA-Z0-9_]{2,32})\]/gi, (_, g) =>
        makeGroup(g.replace(/^\$/, ''))
    );

    // 5. Backward compat: старые PHP-span'ы с data-group (из БД)
    result = result.replace(
        /<span[^>]*data-group=["']([^"']+)["'][^>]*>[\s\S]*?<\/span>/gi,
        (_, g) => makeGroup(g.replace(/^\$/, ''))
    );

    // 6. Backward compat: старые PHP-span'ы с data-user (из БД)
    result = result.replace(
        /<span[^>]*data-user=["']([^"']+)["'][^>]*>[\s\S]*?<\/span>/gi,
        (_, u) => makeUser(u.replace(/^@/, ''))
    );

    // 7. Backward compat: старые span с onclick="topage(...)
    result = result.replace(
        /<span[^>]*onclick=["']topage\(['"]\/?([@$]?[\w\d_-]+)['"]\);?["'][^>]*>[\s\S]*?<\/span>/gi,
        (_, target) => {
            const isGroup = target.startsWith('$');
            const name = target.replace(/^[@$]/, '');
            return isGroup ? makeGroup(name) : makeUser(name);
        }
    );

    // 8. Raw text mentions: @username или $groupname (не внутри HTML-атрибутов)
    const rawMentionRegex = /(?:^|[\s\n>(])(@[a-zA-Z0-9_]{2,32}|\$[a-zA-Z0-9_]{2,32})(?=$|[\s\n<.,!?:;)])/gi;
    result = result.replace(rawMentionRegex, (match, tag) => {
        const isGroup = tag.startsWith('$');
        const name = tag.slice(1);
        const prefix = match.slice(0, match.length - tag.length);
        return prefix + (isGroup ? makeGroup(name) : makeUser(name));
    });

    return result;
}