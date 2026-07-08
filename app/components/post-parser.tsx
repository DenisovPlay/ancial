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
    
    // 1. Форматирование текста (BBCode)
    html = html.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>');
    html = html.replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>');
    html = html.replace(/\[s\]([\s\S]*?)\[\/s\]/gi, '<s>$1</s>');
    // Регулярка для HTML-тегов, чтобы пропускать их
    // И для кастомных [url|text], и сырых ссылок
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
            return `<a href="https://ancial.ru/redirect?link=${encodeURIComponent(url)}" target="_blank" rel="noopener noreferrer" class="text-purple-500 hover:text-purple-600 duration-300">${customText.trim()}</a>`;
        } else if (rawUrl) {
            let url = rawUrl.trim();

            // Защита от расширений файлов, если нет явно http(s)://
            if (!/^https?:\/\//i.test(url) && /\.(php|html?|js|css|zip|rar|exe|png|jpe?g|gif|mp4|avi)$/i.test(url)) {
                return match;
            }

            let finalUrl = url;
            if (!/^https?:\/\//i.test(finalUrl)) {
                finalUrl = 'https://' + finalUrl;
            }
            return `<a href="https://ancial.ru/redirect?link=${encodeURIComponent(finalUrl)}" target="_blank" rel="noopener noreferrer" class="text-purple-500 hover:text-purple-600 duration-300">${url}</a>`;
        }

        return match;
    });

    if (isPreview) {
        // 3. Переносы строк -> <br> (только для превью, так как сервер уже делает nl2br)
        html = html.replace(/\r\n/g, '<br>');
        html = html.replace(/\n/g, '<br>');
    }
    return html;
}