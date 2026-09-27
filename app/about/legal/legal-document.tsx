import Link from 'next/link';
import type { ReactNode } from 'react';

import Icon from '../../components/svg-icon';
import type { LegalBlock, LegalDoc } from './documents/types';

const LINK = 'text-blue-400 hover:text-blue-300 duration-300 break-words';
/** Ссылки внутри текста: [[адрес|текст]], почта и https://… */
const INLINE_RE = /(\[\[[^\]|]+\|[^\]]+\]\]|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|https?:\/\/[^\s,)»;]+)/g;
const SITE_ORIGIN = 'https://zypo.cc';

function DocLink({ href, children }: { href: string; children: ReactNode }) {
  // Адреса своего сайта — внутренней навигацией (и в приложении не уходят в браузер).
  const internal = href.startsWith('/') ? href : href.startsWith(SITE_ORIGIN) ? href.slice(SITE_ORIGIN.length) || '/' : null;
  if (internal !== null) return <Link href={internal} className={LINK}>{children}</Link>;
  return <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>{children}</a>;
}

function Inline({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE_RE)) {
    const index = match.index ?? 0;
    let token = match[0];
    // Точка в конце предложения — не часть адреса.
    const trailing = /[.]+$/.exec(token)?.[0] ?? '';
    if (trailing && !token.startsWith('[[')) token = token.slice(0, -trailing.length);
    if (index > last) parts.push(text.slice(last, index));
    if (token.startsWith('[[')) {
      const [href, label] = token.slice(2, -2).split('|');
      parts.push(<DocLink key={index} href={href}>{label}</DocLink>);
    } else if (token.includes('@') && !token.startsWith('http')) {
      parts.push(<a key={index} href={`mailto:${token}`} className={LINK}>{token}</a>);
    } else {
      parts.push(<DocLink key={index} href={token}>{token.replace(/^https?:\/\//, '')}</DocLink>);
    }
    last = index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === 'string') {
    return <p className="text-zinc-300 leading-relaxed"><Inline text={block} /></p>;
  }
  if ('list' in block) {
    return (
      <ul className="flex flex-col list-disc pl-6 text-zinc-300 leading-relaxed marker:text-zinc-500">
        {block.list.map((item) => <li key={item}><Inline text={item} /></li>)}
      </ul>
    );
  }
  if ('note' in block) {
    return (
      <div className="rounded-3xl border border-zinc-600/30 bg-purple-500/10 p-3 text-zinc-200 leading-relaxed">
        <Inline text={block.note} />
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-3xl border border-zinc-600/30">
      <table className="w-full text-sm text-left">
        <thead className="bg-zinc-800/60 text-zinc-100">
          <tr>{block.table.head.map((cell) => <th key={cell} className="px-3 py-3 font-semibold">{cell}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-zinc-600/30 text-zinc-300">
          {block.table.rows.map((row) => (
            <tr key={row.join('|')}>
              {row.map((cell, index) => <td key={`${index}-${cell}`} className="px-3 py-3 align-top"><Inline text={cell} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Юридический документ целиком: серверная разметка — текст есть в HTML без JS и открытых модалок. */
export default function LegalDocument({ doc }: { doc: LegalDoc }) {
  const isRu = doc.lang === 'ru';

  return (
    <div className="flex flex-col items-center gap-3 py-3 w-full">
      <div className="w-full max-w-3xl flex items-center">
        <Link href="/about/legal" className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 px-3 lg:px-0 cursor-pointer">
          <Icon name="IC-chevron-left" className="w-8 h-8 fill-white inline" />
          {isRu ? 'Документы' : 'Documents'}
        </Link>
      </div>

      <article className="w-full max-w-3xl px-3 lg:px-0 flex flex-col gap-3" lang={doc.lang}>
        <header className="flex flex-col">
          <h1 className="text-3xl font-bold text-white">{doc.title}</h1>
          <span className="text-sm text-zinc-400">
            {isRu ? 'Версия' : 'Version'} {doc.version}. {doc.effective}
          </span>
        </header>

        {doc.intro?.map((block, index) => <Block key={`intro-${index}`} block={block} />)}

        <nav className="rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3 flex flex-col gap-3" aria-label={isRu ? 'Содержание' : 'Contents'}>
          <span className="font-semibold text-white">{isRu ? 'Содержание' : 'Contents'}</span>
          {doc.sections.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="text-zinc-300 hover:text-white duration-300">{section.title}</a>
          ))}
        </nav>

        {doc.sections.map((section) => (
          <section key={section.id} id={section.id} className="flex flex-col gap-3 scroll-mt-6 pt-3">
            <h2 className="text-xl font-bold text-white">{section.title}</h2>
            {section.blocks.map((block, index) => <Block key={`${section.id}-${index}`} block={block} />)}
          </section>
        ))}

        <footer className="text-sm text-zinc-500 pt-3">
          {isRu ? 'Оператор' : 'Operator'}: ZeniFlow · <a href="mailto:contact@zypo.cc" className={LINK}>contact@zypo.cc</a>
        </footer>
      </article>

      <div className="lg:hidden"><br /><br /><br /><br /></div>
    </div>
  );
}
