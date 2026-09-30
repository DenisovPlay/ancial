import { findTokenBounds, isTokenDelimiter, matchAutoLink } from '../lib/auto-link';
import { resolveLinkTarget } from '../lib/link-target';
import { SITE_URL } from '../config';

/**
 * Автоссылки в редакторе поста: слово становится ссылкой сразу, как только оно стало адресом, и
 * пересчитывается при правке (дописали хвост, стёрли символ, поменяли домен). Ссылки, созданные
 * кнопкой «Вставить ссылку», не трогаем — у них нет метки data-auto.
 */
const AUTO_ATTR = 'data-auto';

function isAutoAnchor(node: Node | null | undefined): node is HTMLAnchorElement {
  return Boolean(node && node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'A' && (node as Element).hasAttribute(AUTO_ATTR));
}

function closestAnchor(node: Node | null, root: HTMLElement): HTMLAnchorElement | null {
  for (let current: Node | null = node; current && current !== root; current = current.parentNode) {
    if (current.nodeType === Node.ELEMENT_NODE && (current as Element).tagName === 'A') return current as HTMLAnchorElement;
  }
  return null;
}

function unwrapByDom(anchor: HTMLAnchorElement) {
  const parent = anchor.parentNode;
  if (!parent) return;
  while (anchor.firstChild) parent.insertBefore(anchor.firstChild, anchor);
  parent.removeChild(anchor);
  // Соседние текстовые узлы склеиваются.
  parent.normalize();
}

/**
 * Снимает ссылку через execCommand — так шаг попадает в историю отмены браузера (Ctrl+Z не «застревает»).
 * Курсор после этого возвращает вызывающий (по смещению в тексте).
 */
function unwrap(anchor: HTMLAnchorElement, selection: Selection) {
  const range = document.createRange();
  range.selectNodeContents(anchor);
  selection.removeAllRanges();
  selection.addRange(range);
  const parent = anchor.parentNode;
  if (!document.execCommand('unlink') || anchor.isConnected) unwrapByDom(anchor);
  // unlink оставляет «vk.co» и «m» отдельными текстовыми узлами — склеиваем, иначе слово не найдётся целиком.
  parent?.normalize();
}

const hasDelimiter = (text: string) => Array.from(text).some(isTokenDelimiter);

/** К слову под курсором «прилегает» автоссылка: курсор в ней или сразу рядом, без разделителя. */
function findAdjacentAutoAnchor(node: Node, offset: number): HTMLAnchorElement | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node as Text;
    if (isAutoAnchor(text.previousSibling) && !hasDelimiter(text.data.slice(0, offset))) return text.previousSibling;
    if (isAutoAnchor(text.nextSibling) && !hasDelimiter(text.data.slice(offset))) return text.nextSibling;
    return null;
  }
  const before = node.childNodes[offset - 1];
  const after = node.childNodes[offset];
  if (isAutoAnchor(before)) return before;
  if (isAutoAnchor(after)) return after;
  return null;
}

/** Рядом с ссылкой есть символы того же слова (напечатали хвост мимо неё) — её надо пересобрать. */
function hasAdjacentWordChars(anchor: HTMLAnchorElement) {
  const before = anchor.previousSibling;
  const after = anchor.nextSibling;
  const lastChar = before?.nodeType === Node.TEXT_NODE ? (before as Text).data.slice(-1) : '';
  const firstChar = after?.nodeType === Node.TEXT_NODE ? (after as Text).data.slice(0, 1) : '';
  return (lastChar !== '' && !isTokenDelimiter(lastChar)) || (firstChar !== '' && !isTokenDelimiter(firstChar));
}

function placeCaret(selection: Selection, node: Node, offset: number) {
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

/** Оборачивает часть текстового узла в автоссылку (через createLink — с записью в историю отмены). */
function wrapAutoLink(text: Text, start: number, length: number, href: string, selection: Selection): boolean {
  const range = document.createRange();
  range.setStart(text, start);
  range.setEnd(text, start + length);
  selection.removeAllRanges();
  selection.addRange(range);
  if (document.execCommand('createLink', false, href)) {
    const created = closestAnchorFrom(selection.anchorNode) ?? closestAnchorFrom(selection.focusNode);
    if (created) {
      created.setAttribute(AUTO_ATTR, '1');
      return true;
    }
  }
  // Запасной путь: ручное оборачивание.
  const fallbackRange = document.createRange();
  fallbackRange.setStart(text, start);
  fallbackRange.setEnd(text, start + length);
  const anchor = document.createElement('a');
  anchor.setAttribute('href', href);
  anchor.setAttribute(AUTO_ATTR, '1');
  fallbackRange.surroundContents(anchor);
  return true;
}

function closestAnchorFrom(node: Node | null): HTMLAnchorElement | null {
  for (let current: Node | null = node; current; current = current.parentNode) {
    if (current.nodeType === Node.ELEMENT_NODE && (current as Element).tagName === 'A') return current as HTMLAnchorElement;
  }
  return null;
}

function collectTextNodes(block: Node): Text[] {
  const result: Text[] = [];
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) result.push(node as Text);
  return result;
}

/** Смещение курсора в тексте блока (по символам всех текстовых узлов) — переживает любые правки разметки. */
function getCaretOffset(block: Node, selection: Selection): number | null {
  if (selection.rangeCount === 0 || !selection.anchorNode || !block.contains(selection.anchorNode)) return null;
  const range = document.createRange();
  range.selectNodeContents(block);
  range.setEnd(selection.anchorNode, selection.anchorOffset);
  return range.toString().length;
}

function setCaretOffset(block: Node, selection: Selection, offset: number) {
  let remaining = offset;
  for (const text of collectTextNodes(block)) {
    if (remaining <= text.data.length) {
      placeCaret(selection, text, remaining);
      return;
    }
    remaining -= text.data.length;
  }
}

/** Текстовый узел и позиция в нём по смещению в тексте блока. */
function locateOffset(block: Node, offset: number): { node: Text; offset: number } | null {
  let remaining = offset;
  for (const text of collectTextNodes(block)) {
    if (remaining < text.data.length) return { node: text, offset: remaining };
    remaining -= text.data.length;
  }
  return null;
}

/**
 * Пересчитывает автоссылку под курсором после набора/удаления текста.
 * Возвращает true, если разметка изменилась.
 */
export function autoLinkAtCaret(root: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed || !selection.anchorNode) return false;
  if (!root.contains(selection.anchorNode)) return false;

  const enclosing = closestAnchor(selection.anchorNode, root);
  // Ссылка, созданная вручную, остаётся как есть.
  if (enclosing && !isAutoAnchor(enclosing)) return false;

  const caretOffset = getCaretOffset(root, selection);
  const restoreCaret = () => {
    if (caretOffset !== null) setCaretOffset(root, selection, caretOffset);
  };

  let changed = false;
  const touching = enclosing ?? findAdjacentAutoAnchor(selection.anchorNode, selection.anchorOffset);
  if (touching) {
    const text = touching.textContent ?? '';
    const match = matchAutoLink(text);
    // Текст остался целым адресом и рядом нет хвоста — достаточно обновить адрес ссылки.
    if (match && match.length === text.length && !hasAdjacentWordChars(touching)) {
      if (touching.getAttribute('href') !== match.href) {
        touching.setAttribute('href', match.href);
        return true;
      }
      return false;
    }
    unwrap(touching, selection);
    restoreCaret();
    changed = true;
  }

  const node = selection.anchorNode;
  const caret = selection.anchorOffset;
  if (!node || node.nodeType !== Node.TEXT_NODE || closestAnchor(node, root)) return changed;
  const text = node as Text;

  // Сразу после разделителя дописано слово «закрылось»: ссылкой становится оно.
  const bounds = findTokenBounds(text.data, caret) ?? (caret > 0 ? findTokenBounds(text.data, caret - 1) : null);
  if (!bounds) return changed;
  const match = matchAutoLink(text.data.slice(bounds.start, bounds.end));
  if (!match) return changed;

  wrapAutoLink(text, bounds.start, match.length, match.href, selection);
  restoreCaret();
  return true;
}

/** Блок редактора (прямой потомок корня), в котором стоит курсор. */
function blockOf(root: HTMLElement, node: Node): Node {
  let current: Node = node;
  while (current.parentNode && current.parentNode !== root) current = current.parentNode;
  // Строки без обёртки лежат в корне прямо текстовыми узлами (разделитель — <br>): тогда блок — весь корень.
  return current.parentNode === root && current.nodeType === Node.ELEMENT_NODE ? current : root;
}

/**
 * Ссылки во всём блоке с курсором — после вставки текста с несколькими адресами.
 * Слова внутри уже существующих ссылок пропускаются.
 */
export function autoLinkBlock(root: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.anchorNode || !root.contains(selection.anchorNode)) return false;
  const block = blockOf(root, selection.anchorNode);
  const caret = getCaretOffset(block, selection);

  // Сначала находим все адреса по смещениям в тексте блока, потом оборачиваем с конца:
  // так ранние смещения не сдвигаются, а узлы каждый раз ищем заново (createLink их пересоздаёт).
  const found: Array<{ absStart: number; href: string; length: number }> = [];
  let base = 0;
  for (const text of collectTextNodes(block)) {
    if (!closestAnchor(text, root)) {
      const wordPattern = /[^\s\u200B\u00A0(<"'«[]+/gu;
      for (let word = wordPattern.exec(text.data); word; word = wordPattern.exec(text.data)) {
        const match = matchAutoLink(word[0]);
        if (match) found.push({ absStart: base + word.index, href: match.href, length: match.length });
      }
    }
    base += text.data.length;
  }

  for (const item of found.reverse()) {
    const target = locateOffset(block, item.absStart);
    if (target) wrapAutoLink(target.node, target.offset, item.length, item.href, selection);
  }

  if (found.length > 0 && caret !== null) setCaretOffset(block, selection, caret);
  return found.length > 0;
}

/** Куда ведёт ссылка в редакторе (у внутренних адрес в разметке относительный). */
function resolveAnchorTarget(anchor: HTMLAnchorElement): string {
  let href = anchor.getAttribute('href') ?? '';
  if (href.startsWith('/redirect?')) {
    try {
      href = new URL(href, SITE_URL).searchParams.get('link') ?? href;
    } catch {
      // Оставляем как есть.
    }
  } else if (anchor.hasAttribute('data-internal') && href.startsWith('/')) {
    href = `${SITE_URL}${href}`;
  }
  return href;
}

/**
 * После загрузки поста в редактор: ссылки, чей текст сам является адресом (и ведут туда же),
 * помечаем автоссылками — их можно править прямо в тексте, адрес пересчитается.
 */
export function markAutoAnchors(root: HTMLElement) {
  root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    if (anchor.hasAttribute(AUTO_ATTR)) return;
    const text = anchor.textContent ?? '';
    const match = matchAutoLink(text);
    if (!match || match.length !== text.length) return;
    const target = resolveAnchorTarget(anchor);
    const normalize = (value: string) => {
      const resolved = resolveLinkTarget(value);
      return (resolved.type === 'mail' ? `mailto:${resolved.email}` : resolved.url).replace(/\/$/, '').toLowerCase();
    };
    if (normalize(target) === normalize(match.href)) anchor.setAttribute(AUTO_ATTR, '1');
  });
}
