'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { cn, SvgIcon } from '../feed/editor-shared';
import { parsePostContentToHtml, getVisibleLength } from './post-parser';
import Modal from './modal';

const VISIBLE_CHAR_LIMIT = 3000;

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  strings?: Record<string, string>;
  editorClassName?: string;
};

type ActiveFormats = {
  bold: boolean;
  italic: boolean;
  strikeThrough: boolean;
  link: boolean;
  h1: boolean;
  h2: boolean;
  h3: boolean;
  ul: boolean;
  ol: boolean;
  quote: boolean;
  spoiler: boolean;
  fn: boolean;
};

// ─── htmlToBBCode ─────────────────────────────────────────────────────────────
// Конвертирует HTML из contentEditable обратно в BBCode для хранения.
function htmlToBBCode(html: string): string {
  if (typeof window === 'undefined') return html;

  // Очищаем мусорные инлайновые стили фонов, которые плодит Chrome в contentEditable
  const cleanHtml = html.replace(/style="background-color:\s*rgba\(255,\s*255,\s*255,\s*0\.15\);?"/gi, '');

  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanHtml, 'text/html');

  function buildTableBBCode(tableEl: HTMLTableElement): string {
    let result = '[table]\n';
    Array.from(tableEl.rows).forEach((row) => {
      result += '[tr]';
      Array.from(row.cells).forEach((cell) => {
        const tag = cell.tagName.toLowerCase() === 'th' ? 'th' : 'td';
        // Рекурсивно обрабатываем содержимое ячейки
        let cellContent = '';
        for (let i = 0; i < cell.childNodes.length; i++) {
          cellContent += processNode(cell.childNodes[i]);
        }
        result += `[${tag}]${cellContent.trim()}[/${tag}]`;
      });
      result += '[/tr]\n';
    });
    result += '[/table]';
    return result;
  }

  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    // 1. data-bbcode: карусель, коллаж — round-trip через data-атрибут
    const encodedBBCode = el.getAttribute('data-bbcode');
    if (encodedBBCode) {
      try {
        return '\n' + decodeURIComponent(encodedBBCode) + '\n';
      } catch {
        return '';
      }
    }

    if (tagName === 'br') return '\n';

    // Рекурсивно собираем inner content
    let inner = '';
    for (let i = 0; i < el.childNodes.length; i++) {
      inner += processNode(el.childNodes[i]);
    }

    // ── Блочные: заголовки ────────────────────────────────────────────────
    if (tagName === 'h1' || tagName === 'h2') return `[h1]${inner.trim()}[/h1]\n`;
    if (tagName === 'h3') return `[h2]${inner.trim()}[/h2]\n`;
    if (tagName === 'h4') return `[h3]${inner.trim()}[/h3]\n`;
    if (tagName === 'h5') return `[h3]${inner.trim()}[/h3]\n`;
    if (tagName === 'h6') return `[h3]${inner.trim()}[/h3]\n`;

    // ── Блочные: списки — правильно рекурсируем в li ──────────────────────
    if (tagName === 'ul') {
      let items = '';
      Array.from(el.childNodes).forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE &&
          (child as HTMLElement).tagName.toLowerCase() === 'li') {
          let liContent = '';
          for (let i = 0; i < child.childNodes.length; i++) {
            liContent += processNode(child.childNodes[i]);
          }
          items += `[li]${liContent.trim()}[/li]\n`;
        }
      });
      return `[ul]\n${items}[/ul]\n`;
    }
    if (tagName === 'ol') {
      let items = '';
      Array.from(el.childNodes).forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE &&
          (child as HTMLElement).tagName.toLowerCase() === 'li') {
          let liContent = '';
          for (let i = 0; i < child.childNodes.length; i++) {
            liContent += processNode(child.childNodes[i]);
          }
          items += `[li]${liContent.trim()}[/li]\n`;
        }
      });
      return `[ol]\n${items}[/ol]\n`;
    }
    if (tagName === 'li') {
      // Обрабатывается выше, но если попался orphan — возвращаем inner
      return inner;
    }

    // ── Блочные: цитата ───────────────────────────────────────────────────
    if (tagName === 'blockquote') {
      const author = el.getAttribute('data-author') || '';
      // Убираем из inner текст авторского span (первый span внутри blockquote с автором)
      const authorSpan = el.querySelector('span:first-child');
      const authorText = authorSpan?.textContent?.trim() || '';
      const bodyText = author && authorText
        ? inner.replace(authorText, '').trim()
        : inner.trim();
      return author
        ? `[quote=${author}]${bodyText}[/quote]\n`
        : `[quote]${inner.trim()}[/quote]\n`;
    }

    // ── Инлайн: спойлер (новый формат) ─────────────────────────────────────
    if (tagName === 'span' && el.classList.contains('ancial-spoiler-editor')) {
      return `[spoiler]${inner}[/spoiler]`;
    }

    // ── Блочные: спойлер / details (обратная совместимость старых постов) ────
    if (tagName === 'details') {
      const summaryEl = el.querySelector(':scope > summary');
      const summaryTitle = summaryEl?.textContent?.trim() || 'Спойлер';
      let body = '';
      Array.from(el.childNodes).forEach(child => {
        if (child.nodeName !== 'SUMMARY') {
          body += processNode(child);
        }
      });
      return `[spoiler]${body.trim()}[/spoiler]`;
    }

    // ── Блочные: таблица ──────────────────────────────────────────────────
    if (tagName === 'table') {
      return buildTableBBCode(el as HTMLTableElement) + '\n';
    }

    // ── Инлайн: сноска ────────────────────────────────────────────────────
    if (tagName === 'sup') {
      const cleanInner = inner.replace(/[\u200B\s]/g, '');
      if (!cleanInner) return '';
      return `[fn]${inner}[/fn]`;
    }

    // ── Инлайн: форматирование ────────────────────────────────────────────
    if (tagName === 'b' || tagName === 'strong') return `[b]${inner}[/b]`;
    if (tagName === 'i' || tagName === 'em') return `[i]${inner}[/i]`;
    if (tagName === 's' || tagName === 'strike' || tagName === 'del') return `[s]${inner}[/s]`;
    if (tagName === 'a') {
      let href = (el as HTMLAnchorElement).getAttribute('href') || '';
      if (href.includes('redirect?link=')) {
        try {
          href = decodeURIComponent(href.split('redirect?link=')[1]);
        } catch { /* ignore */ }
      }
      return `[${href}|${inner}]`;
    }

    // ── Блочные: div / p (перенос строки) ────────────────────────────────
    if (tagName === 'div' || tagName === 'p') {
      if (!inner || inner === '\n') return '\n';
      // Если inner уже заканчивается на \n, не добавляем ещё
      return inner.endsWith('\n') ? inner : '\n' + inner;
    }

    // ── Остальные ─────────────────────────────────────────────────────────
    return inner;
  }

  let result = '';
  for (let i = 0; i < doc.body.childNodes.length; i++) {
    result += processNode(doc.body.childNodes[i]);
  }

  // Убираем leading/trailing пустые строки
  return result.replace(/^[\n\r]+|[\n\r]+$/g, '');
}

export { getVisibleLength, VISIBLE_CHAR_LIMIT };

// ─── RichTextEditor ───────────────────────────────────────────────────────────
export default function RichTextEditor({ value, onChange, placeholder, className, strings, editorClassName }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);
  const [isEmpty, setIsEmpty] = useState(!value);
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>({
    bold: false, italic: false, strikeThrough: false, link: false,
    h1: false, h2: false, h3: false, ul: false, ol: false, quote: false,
    spoiler: false, fn: false,
  });

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [savedRange, setSavedRange] = useState<Range | null>(null);

  const visibleLength = getVisibleLength(value);
  const isOverLimit = visibleLength > VISIBLE_CHAR_LIMIT;
  const isNearLimit = !isOverLimit && visibleLength > VISIBLE_CHAR_LIMIT * 0.85;

  const getBottomOffset = () => {
    if (!editorClassName) return '3.5rem';
    if (editorClassName.includes('pb-[13.5rem]')) return '13.5rem';
    if (editorClassName.includes('pb-[11rem]')) return '11rem';
    if (editorClassName.includes('pb-[6rem]')) return '6rem';
    if (editorClassName.includes('pb-[3.5rem]')) return '3.5rem';
    return '3.5rem';
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = editorRef.current?.offsetHeight || 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (editorRef.current) {
        const deltaY = moveEvent.clientY - startY;
        const newHeight = startHeight + deltaY;
        if (newHeight > 180 && newHeight < window.innerHeight - 150) {
          editorRef.current.style.maxHeight = 'none';
          editorRef.current.style.height = `${newHeight}px`;
        }
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Устанавливаем <br> как разделитель параграфов по умолчанию
  useEffect(() => {
    document.execCommand('defaultParagraphSeparator', false, 'br');
  }, []);

  // Синхронизируем value → innerHTML (только при внешнем изменении value)
  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current && value !== undefined) {
      const div = editorRef.current;
      const parsedHtml = parsePostContentToHtml(value, true);
      if (div.innerHTML !== parsedHtml) {
        div.innerHTML = parsedHtml;
        setIsEmpty(!value || !div.textContent?.trim());
      }
    }
  }, [value]);

  // Определяет активные форматы в текущей позиции курсора
  const updateActiveFormats = useCallback(() => {
    if (!editorRef.current) return;
    const sel = window.getSelection();
    if (!sel) return;

    const focusEl = sel.focusNode?.nodeType === Node.ELEMENT_NODE
      ? (sel.focusNode as HTMLElement)
      : sel.focusNode?.parentElement;

    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      strikeThrough: document.queryCommandState('strikeThrough'),
      link: !!focusEl?.closest('a'),
      h1: !!focusEl?.closest('h2'),
      h2: !!focusEl?.closest('h3'),
      h3: !!focusEl?.closest('h4'),
      ul: !!focusEl?.closest('ul'),
      ol: !!focusEl?.closest('ol'),
      quote: !!focusEl?.closest('blockquote'),
      spoiler: !!focusEl?.closest('.ancial-spoiler-editor'),
      fn: !!focusEl?.closest('sup'),
    });
  }, []);

  // Читает innerHTML и конвертирует в BBCode → вызывает onChange
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;

    // Очистка пустых sup-тегов (сносок)
    const sups = editorRef.current.getElementsByTagName('sup');
    const sel = window.getSelection();
    let changed = false;

    Array.from(sups).forEach(sup => {
      const text = sup.textContent?.replace(/[\u200B\s]/g, '') || '';
      const isFocused = sel && sel.anchorNode && (sup === sel.anchorNode || sup.contains(sel.anchorNode));

      if (text === '' && (!isFocused || sup.innerHTML === '' || sup.innerHTML === '<br>')) {
        const parent = sup.parentNode;
        if (parent) {
          const nextSibling = sup.nextSibling;
          const prevSibling = sup.previousSibling;
          parent.removeChild(sup);
          changed = true;

          if (isFocused && sel) {
            const newRange = document.createRange();
            if (nextSibling) {
              newRange.setStart(nextSibling, 0);
            } else if (prevSibling) {
              newRange.setStart(prevSibling, prevSibling.textContent?.length || 0);
            } else {
              newRange.setStart(parent, 0);
            }
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
          }
        }
      }
    });

    isUpdatingRef.current = true;
    const html = editorRef.current.innerHTML;
    const bbcode = htmlToBBCode(html);
    onChange(bbcode);
    setIsEmpty(!bbcode || !editorRef.current.textContent?.trim());
    updateActiveFormats();
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);
  }, [onChange, updateActiveFormats]);

  // Обёртка для execCommand с обновлением состояния
  const execCmd = useCallback((command: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    handleInput();
    updateActiveFormats();
  }, [handleInput, updateActiveFormats]);

  // ── insertBlock: вставляет WYSIWYG HTML вместо raw BBCode текста ──────────
  const insertBlock = useCallback((type: string) => {
    // Фокусим только если редактор реально не в фокусе
    if (document.activeElement !== editorRef.current) {
      editorRef.current?.focus();
    }

    const sel = window.getSelection();
    const focusEl = sel?.focusNode?.nodeType === Node.ELEMENT_NODE
      ? (sel.focusNode as HTMLElement)
      : sel?.focusNode?.parentElement;

    let selectedHtml = '';
    if (sel && sel.rangeCount > 0) {
      const div = document.createElement('div');
      div.appendChild(sel.getRangeAt(0).cloneContents());
      selectedHtml = div.innerHTML;
    }

    switch (type) {
      case 'h1':
        // Тоггл: если уже в H1 — возвращаем к параграфу
        document.execCommand('formatBlock', false, activeFormats.h1 ? 'p' : 'h2');
        break;
      case 'h2':
        document.execCommand('formatBlock', false, activeFormats.h2 ? 'p' : 'h3');
        break;
      case 'h3':
        document.execCommand('formatBlock', false, activeFormats.h3 ? 'p' : 'h4');
        break;
      case 'ul':
        document.execCommand('insertUnorderedList');
        break;
      case 'ol':
        document.execCommand('insertOrderedList');
        break;
      case 'quote':
        document.execCommand('formatBlock', false, activeFormats.quote ? 'p' : 'blockquote');
        break;
      case 'spoiler': {
        const spoilerNode = focusEl?.closest('.ancial-spoiler-editor') as HTMLElement | null;
        if (spoilerNode) {
          const parent = spoilerNode.parentNode;
          if (parent) {
            const frag = document.createDocumentFragment();
            while (spoilerNode.firstChild) {
              frag.appendChild(spoilerNode.firstChild);
            }
            const firstChild = frag.firstChild;
            parent.replaceChild(frag, spoilerNode);
            if (sel && firstChild) {
              const newRange = document.createRange();
              newRange.selectNodeContents(firstChild);
              sel.removeAllRanges();
              sel.addRange(newRange);
            }
          }
        } else if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const spoilerSpan = document.createElement('span');
          spoilerSpan.className = 'ancial-spoiler-editor';
          const hasSelection = !range.collapsed;
          if (hasSelection) {
            const extracted = range.extractContents();
            spoilerSpan.appendChild(extracted);
          } else {
            spoilerSpan.textContent = 'Текст спойлера';
          }
          range.insertNode(spoilerSpan);
          // Ставим курсор внутрь
          const newRange = document.createRange();
          newRange.selectNodeContents(spoilerSpan);
          newRange.collapse(false);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
        break;
      }
      case 'fn': {
        const supNode = focusEl?.closest('sup');
        if (supNode) {
          // Тоггл OFF: удаляем сноску, превращая в обычный текст
          const parent = supNode.parentNode;
          if (parent) {
            const frag = document.createDocumentFragment();
            const childNodes = Array.from(supNode.childNodes);
            childNodes.forEach(child => frag.appendChild(child));

            const firstChild = childNodes[0];
            const lastChild = childNodes[childNodes.length - 1];

            parent.replaceChild(frag, supNode);

            if (sel && firstChild && lastChild) {
              const newRange = document.createRange();
              newRange.setStartBefore(firstChild);
              newRange.setEndAfter(lastChild);
              sel.removeAllRanges();
              sel.addRange(newRange);
            }
          }
        } else {
          // Тоггл ON: активируем сноску инлайново
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);

            if (range.collapsed) {
              // Если выделения нет — вставляем пустой sup с zero-width space и ставим каретку внутрь
              const supElem = document.createElement('sup');
              supElem.className = 'text-purple-400 underline decoration-dotted text-xs cursor-text';
              supElem.innerHTML = '&#8203;';

              range.insertNode(supElem);

              const newRange = document.createRange();
              newRange.setStart(supElem.firstChild!, 1);
              newRange.collapse(true);
              sel.removeAllRanges();
              sel.addRange(newRange);
            } else {
              // Если текст выделен — просто оборачиваем его в sup
              const supElem = document.createElement('sup');
              supElem.className = 'text-purple-400 underline decoration-dotted text-xs cursor-text';
              supElem.innerHTML = selectedHtml;

              range.deleteContents();
              range.insertNode(supElem);

              // Выделяем содержимое обратно
              const newRange = document.createRange();
              newRange.selectNodeContents(supElem);
              sel.removeAllRanges();
              sel.addRange(newRange);
            }
          }
        }
        break;
      }
    }

    handleInput();
    updateActiveFormats();
  }, [activeFormats, handleInput, updateActiveFormats]);

  // ── Обработка ссылок ──────────────────────────────────────────────────────
  const handleLink = () => {
    const selection = window.getSelection();
    let parentA: HTMLAnchorElement | null = null;
    let initialUrl = '';
    let initialText = '';
    let targetRange: Range | null = null;

    if (selection && selection.rangeCount > 0) {
      if (editorRef.current?.contains(selection.anchorNode)) {
        targetRange = selection.getRangeAt(0);

        let node: Node | null = selection.anchorNode;
        while (node && node !== editorRef.current) {
          if (node.nodeName === 'A') {
            parentA = node as HTMLAnchorElement;
            break;
          }
          node = node.parentNode;
        }

        if (parentA) {
          initialText = parentA.textContent || '';
          let href = parentA.getAttribute('href') || '';
          if (href.includes('redirect?link=')) {
            try {
              const urlObj = new URL(href);
              const linkParam = urlObj.searchParams.get('link');
              if (linkParam) href = linkParam;
            } catch { /* ignore */ }
          }
          initialUrl = href;
          targetRange = document.createRange();
          targetRange.selectNode(parentA);
        } else {
          initialText = selection.toString();
        }
      }
    }

    setSavedRange(targetRange);
    setLinkText(initialText);
    setLinkUrl(initialUrl);
    setIsLinkModalOpen(true);
  };

  const handleSubmitLink = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLinkModalOpen(false);

    const url = linkUrl.trim();
    if (!url) return;

    const text = linkText.trim() || url;

    if (savedRange) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      }
    } else {
      editorRef.current?.focus();
    }

    const a = document.createElement('a');
    let finalUrl = url;
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;
    a.href = finalUrl;
    a.textContent = text;

    document.execCommand('insertHTML', false, a.outerHTML);
    handleInput();
    updateActiveFormats();
  };

  // ── Клавиатурные хуки ─────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Backspace логика для пустых цитат, сносок и спойлеров, а также для отмены форматирования из начала блока
    if (e.key === 'Backspace') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
        const focusEl = sel.focusNode?.nodeType === Node.ELEMENT_NODE
          ? (sel.focusNode as HTMLElement)
          : sel.focusNode?.parentElement;

        // Помощник для проверки, находится ли курсор в самом начале блока (до любого видимого текста)
        const isAtStartOfBlock = (block: HTMLElement) => {
          const range = sel.getRangeAt(0);
          const preRange = range.cloneRange();
          preRange.selectNodeContents(block);
          preRange.setEnd(range.startContainer, range.endOffset);
          const textBefore = preRange.toString().replace(/[\u200B\s]/g, '');
          return textBefore === '';
        };

        // 1. Цитата (blockquote)
        const quoteBlock = focusEl?.closest('blockquote');
        if (quoteBlock) {
          const text = quoteBlock.textContent?.replace(/[\u200B\s]/g, '') || '';
          if (text === '' || isAtStartOfBlock(quoteBlock)) {
            e.preventDefault();
            const p = document.createElement('p');

            // Переносим контент из цитаты в параграф
            while (quoteBlock.firstChild) {
              p.appendChild(quoteBlock.firstChild);
            }

            // Если цитата была с автором, убираем заголовочный span автора
            const authorSpan = p.querySelector('span:first-child');
            if (authorSpan && quoteBlock.getAttribute('data-author')) {
              authorSpan.parentNode?.removeChild(authorSpan);
            }

            quoteBlock.parentNode?.replaceChild(p, quoteBlock);

            const newRange = document.createRange();
            newRange.setStart(p.firstChild || p, 0);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            handleInput();
            return;
          }
        }

        // 2. Сноска (sup)
        const supBlock = focusEl?.closest('sup');
        if (supBlock) {
          const text = supBlock.textContent?.replace(/[\u200B\s]/g, '') || '';
          if (text === '' || isAtStartOfBlock(supBlock)) {
            e.preventDefault();
            const parent = supBlock.parentNode;
            if (parent) {
              const prevSibling = supBlock.previousSibling;
              const nextSibling = supBlock.nextSibling;
              const frag = document.createDocumentFragment();
              const childNodes = Array.from(supBlock.childNodes);
              childNodes.forEach(child => frag.appendChild(child));
              const firstChild = childNodes[0];

              parent.replaceChild(frag, supBlock);

              const newRange = document.createRange();
              if (firstChild) {
                newRange.setStartBefore(firstChild);
              } else if (nextSibling) {
                newRange.setStartBefore(nextSibling);
              } else if (prevSibling) {
                newRange.setStartAfter(prevSibling);
              } else {
                newRange.setStart(parent, 0);
              }
              newRange.collapse(true);
              sel.removeAllRanges();
              sel.addRange(newRange);
            }
            handleInput();
            return;
          }
        }

        // 3. Спойлер (span.ancial-spoiler-editor) — инлайновый, браузер сам обрабатывает Backspace
      }
    }

    // Enter логика
    if (e.key === 'Enter') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
        const focusEl = sel.focusNode?.nodeType === Node.ELEMENT_NODE
          ? (sel.focusNode as HTMLElement)
          : sel.focusNode?.parentElement;

        const supBlock = focusEl?.closest('sup');
        const quoteBlock = focusEl?.closest('blockquote');
        // --- SHIFT + ENTER (Перенос строки ВНУТРИ блока) ---
        if (e.shiftKey) {
          if (supBlock || quoteBlock) {
            e.preventDefault();
            const range = sel.getRangeAt(0);
            const br = document.createElement('br');
            range.deleteContents();
            range.insertNode(br);

            range.setStartAfter(br);
            range.collapse(true);

            const textNode = document.createTextNode('\u200B');
            br.parentNode?.insertBefore(textNode, br.nextSibling);
            range.setStart(textNode, 1);
            range.collapse(true);

            sel.removeAllRanges();
            sel.addRange(range);
            handleInput();
            return;
          }
          return;
        }

        // --- ОБЫЧНЫЙ ENTER (Выход из блока наружу) ---

        // 2. Сноска (sup) -> Выходим наружу
        if (supBlock) {
          e.preventDefault();
          const range = sel.getRangeAt(0);

          const postRange = range.cloneRange();
          postRange.selectNodeContents(supBlock);
          postRange.setStart(range.endContainer, range.endOffset);
          const postContent = postRange.cloneContents();
          postRange.deleteContents();

          const br = document.createElement('br');
          const textNode = document.createTextNode('\u200B');

          supBlock.parentNode?.insertBefore(br, supBlock.nextSibling);
          br.parentNode?.insertBefore(textNode, br.nextSibling);

          if (postContent.textContent) {
            textNode.parentNode?.insertBefore(postContent, textNode.nextSibling);
          }

          const newRange = document.createRange();
          newRange.setStart(textNode, 1);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
          handleInput();
          return;
        }

        // 3. Цитата (blockquote) -> Выходим наружу
        if (quoteBlock) {
          e.preventDefault();
          const range = sel.getRangeAt(0);

          const postRange = range.cloneRange();
          postRange.selectNodeContents(quoteBlock);
          postRange.setStart(range.endContainer, range.endOffset);
          const postContent = postRange.cloneContents();
          postRange.deleteContents();

          const p = document.createElement('p');
          p.innerHTML = '<br>';
          quoteBlock.insertAdjacentElement('afterend', p);

          if (postContent.textContent?.trim()) {
            p.innerHTML = '';
            p.appendChild(postContent);
          }

          const newRange = document.createRange();
          newRange.setStart(p, 0);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);

          if (quoteBlock.textContent?.trim() === '' && !quoteBlock.querySelector('img')) {
            quoteBlock.parentNode?.removeChild(quoteBlock);
          }

          handleInput();
          return;
        }

        // 4. Спойлер (span.ancial-spoiler-editor) — инлайновый, Enter выходит после span
        const spoilerBlock = focusEl?.closest('.ancial-spoiler-editor') as HTMLElement | null;
        if (spoilerBlock) {
          e.preventDefault();
          // Вставляем <br> после span и переносим туда курсор
          const br = document.createElement('br');
          const textAfter = document.createTextNode('\u200B');
          spoilerBlock.insertAdjacentElement('afterend', br);
          br.parentNode?.insertBefore(textAfter, br.nextSibling);
          const newRange = document.createRange();
          newRange.setStart(textAfter, 1);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
          handleInput();
          return;
        }

        // 5. Заголовки (H2, H3, H4) — Enter на конце выходит в обычный абзац
        const headingBlock = focusEl?.closest('h2, h3, h4');
        if (headingBlock) {
          const range = sel.getRangeAt(0);
          const endRange = document.createRange();
          endRange.selectNodeContents(headingBlock);
          endRange.setStart(range.endContainer, range.endOffset);
          if (endRange.toString() === '') {
            e.preventDefault();
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            headingBlock.insertAdjacentElement('afterend', p);
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            handleInput();
            return;
          }
        }
      }
    }

    // Auto-link при пробеле/Enter
    if (e.key === ' ' || e.key === 'Enter') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return;

      const node = selection.focusNode;
      if (!node || node.nodeType !== Node.TEXT_NODE) return;
      if (node.parentElement?.closest('a')) return;

      const offset = selection.focusOffset;
      const textBeforeCaret = node.textContent?.slice(0, offset) || '';

      const AUTO_LINK_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(?:https?:\/\/)?(?:[a-zA-Z0-9\-а-яА-ЯёЁ]+\.)+[a-zA-Zа-яА-ЯёЁ]{2,20}(?:\/[^\s<]*[^<.,:;"')\]\s]|\/)?)$/u;

      const match = textBeforeCaret.match(AUTO_LINK_REGEX);
      if (match && match[0]) {
        e.preventDefault();
        const url = match[0];
        const urlStartOffset = textBeforeCaret.lastIndexOf(url);

        const range = document.createRange();
        range.setStart(node, urlStartOffset);
        range.setEnd(node, urlStartOffset + url.length);
        selection.removeAllRanges();
        selection.addRange(range);

        let finalUrl = url;
        if (!/^https?:\/\//i.test(finalUrl) && !finalUrl.includes('@')) {
          finalUrl = 'https://' + finalUrl;
        } else if (finalUrl.includes('@') && !finalUrl.startsWith('mailto:')) {
          finalUrl = 'mailto:' + finalUrl;
        }

        document.execCommand('createLink', false, finalUrl);
        selection.collapseToEnd();

        const aNode = selection.focusNode?.parentElement?.closest('a');
        if (aNode) {
          const temp = document.createTextNode('\u200B');
          aNode.parentNode?.insertBefore(temp, aNode.nextSibling);
          selection.collapse(temp, 1);
        }

        if (e.key === 'Enter') {
          document.execCommand('insertLineBreak');
        } else {
          document.execCommand('insertText', false, ' ');
        }

        handleInput();
      }
    }
  };

  // ── UI компоненты кнопок тулбара ─────────────────────────────────────────
  function InlineBtn({
    onClick, active, title, children,
  }: { onClick: () => void; active: boolean; title: string; children: React.ReactNode }) {
    return (
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className={cn(
          'flex justify-center items-center cursor-pointer rounded-2xl h-7 w-7 border shadow duration-300 active:scale-95 shrink-0',
          active
            ? 'bg-zinc-200 text-zinc-900 border-zinc-300'
            : 'bg-zinc-900 hover:bg-zinc-700 text-white border-zinc-600/30 text-zinc-400',
        )}
        title={title}
      >
        {children}
      </button>
    );
  }

  function BlockBtn({
    onClick, active, title, children,
  }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) {
    return (
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className={cn(
          'flex justify-center items-center cursor-pointer rounded-2xl h-7 px-1.5 border shadow duration-300 active:scale-95 text-xs font-bold shrink-0',
          active
            ? 'bg-zinc-200 text-zinc-900 border-zinc-300'
            : 'bg-zinc-900 hover:bg-zinc-700 text-white border-zinc-600/30 text-zinc-400',
        )}
        title={title}
      >
        {children}
      </button>
    );
  }

  function Divider() {
    return <div className="w-[1px] h-4 bg-zinc-600/50 mx-0.5 shrink-0" />;
  }

  return (
    <div className={cn('flex flex-col w-full relative overflow-hidden', className)}>
      {/* ── Тулбар (парит сверху, скроллится по горизонтали) ── */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-transparent flex items-center gap-1.5 p-1.5 overflow-x-auto overflow-y-hidden whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden shrink-0">
        {/* Инлайн форматирование */}
        <InlineBtn onClick={() => execCmd('bold')} active={activeFormats.bold} title={strings?.editor_bold || 'Жирный'}>
          <strong>B</strong>
        </InlineBtn>
        <InlineBtn onClick={() => execCmd('italic')} active={activeFormats.italic} title={strings?.editor_italic || 'Курсив'}>
          <em className="font-serif">I</em>
        </InlineBtn>
        <InlineBtn onClick={() => execCmd('strikeThrough')} active={activeFormats.strikeThrough} title={strings?.editor_strikethrough || 'Зачёркнутый'}>
          <s>S</s>
        </InlineBtn>
        <InlineBtn onClick={handleLink} active={activeFormats.link} title={strings?.editor_link_insert || 'Ссылка'}>
          <SvgIcon className="w-5 h-5 fill-current" id="IC-link" />
        </InlineBtn>

        <Divider />

        {/* Заголовки */}
        <BlockBtn onClick={() => insertBlock('h1')} active={activeFormats.h1} title={strings?.editor_h1 || 'Заголовок H1'}>
          <SvgIcon className="w-5 h-5 fill-current" id="IC-heading-1" />
        </BlockBtn>
        <BlockBtn onClick={() => insertBlock('h2')} active={activeFormats.h2} title={strings?.editor_h2 || 'Заголовок H2'}>
          <SvgIcon className="w-5 h-5 fill-current" id="IC-heading-2" />
        </BlockBtn>
        <BlockBtn onClick={() => insertBlock('h3')} active={activeFormats.h3} title={strings?.editor_h3 || 'Заголовок H3'}>
          <SvgIcon className="w-5 h-5 fill-current" id="IC-heading-3" />
        </BlockBtn>

        <Divider />

        {/* Списки */}
        <BlockBtn onClick={() => insertBlock('ul')} active={activeFormats.ul} title={strings?.editor_list_ul || 'Список'}>
          <SvgIcon className="w-5 h-5 fill-current" id="IC-list-ul" />
        </BlockBtn>
        <BlockBtn onClick={() => insertBlock('ol')} active={activeFormats.ol} title={strings?.editor_list_ol || 'Нумерованный'}>
          <SvgIcon className="w-5 h-5 fill-current" id="IC-list-ol" />
        </BlockBtn>

        <Divider />

        {/* Блочные */}
        <BlockBtn onClick={() => insertBlock('quote')} active={activeFormats.quote} title={strings?.editor_quote || 'Цитата'}>
          <SvgIcon className="w-5 h-5 fill-current" id="IC-quote" />
        </BlockBtn>
        <BlockBtn onClick={() => insertBlock('spoiler')} active={activeFormats.spoiler} title={strings?.editor_spoiler || 'Спойлер'}>
          <SvgIcon className="w-5 h-5 fill-current" id="IC-spoiler" />
        </BlockBtn>
        <BlockBtn onClick={() => insertBlock('fn')} active={activeFormats.fn} title={strings?.editor_footnote || 'Сноска'}>
          <SvgIcon className="w-5 h-5 fill-current" id="IC-footnote" />
        </BlockBtn>
      </div>

      {/* ── Редактируемая область ── */}
      <div className="relative">
        {isEmpty && placeholder && (
          <div className="absolute top-[2.5rem] left-3 text-zinc-500 pointer-events-none whitespace-pre-wrap select-none z-10">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleInput}
          onKeyDown={handleKeyDown}
          onMouseUp={updateActiveFormats}
          onKeyUp={updateActiveFormats}
          className={cn(
            'rich-editor bg-transparent px-3 pt-[2.5rem] w-full text-white max-h-[calc(100vh-14rem)] md:max-h-[calc(100vh-20rem)] overflow-y-auto',
            'focus:outline-none duration-300 whitespace-pre-wrap break-words',
            '[&_a]:text-purple-500 [&_a]:hover:text-purple-400 [&_a]:duration-300',
            editorClassName || 'pb-24 min-h-[16rem]'
          )}
          style={{ userSelect: 'text' }}
        />

        {/* ── Тянулка (Resizer Handle) ── */}
        <div
          onMouseDown={handleResizeMouseDown}
          className="hidden lg:absolute right-3 z-20 cursor-ns-resize flex items-center justify-center w-6 h-6 text-zinc-500 hover:text-zinc-300 active:scale-95 duration-150 select-none bg-zinc-950/40 hover:bg-zinc-950/80 rounded-3xl border border-zinc-600/30"
          style={{ bottom: `calc(${getBottomOffset()} + 6px)` }}
          title={strings?.editor_resize || 'Растянуть поле ввода'}
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M20 20H4v-2h16v2zm0-8H4v-2h16v2zM4 4h16v2H4V4z" opacity="0.3" />
            <path d="M8 9h8v2H8V9zm0 6h8v2H8v-2z" />
          </svg>
        </div>
      </div>

      {/* ── Модальное окно вставки ссылки ── */}
      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title={strings?.editor_link_insert || 'Вставить ссылку'}
      >
        <form onSubmit={handleSubmitLink} className="flex flex-col gap-3">
          <div className="flex flex-col w-full text-left">
            <span className="text-zinc-400 pl-4 z-20 -mt-1.5 text-sm">
              {strings?.editor_link_text || 'Текст ссылки'}
            </span>
            <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
              <input
                type="text"
                autoFocus
                className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-white"
                placeholder="Текст для отображения"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col w-full text-left mt-2">
            <span className="text-zinc-400 pl-4 z-20 -mt-1.5 text-sm">URL</span>
            <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
              <input
                type="url"
                required
                className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-white"
                placeholder="https://google.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-3xl shadow cursor-pointer font-bold mt-2"
          >
            {strings?.editor_link_insert_btn || 'Вставить'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
