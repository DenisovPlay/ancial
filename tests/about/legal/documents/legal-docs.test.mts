import test from 'node:test';
import assert from 'node:assert/strict';

import { LEGAL_CATALOG, LEGAL_CONSENT_VERSION } from '../../../../app/about/legal/documents/catalog.ts';
import { LEGAL_DOCS } from '../../../../app/about/legal/documents/index.ts';
import type { LegalBlock } from '../../../../app/about/legal/documents/types.ts';

function blockTexts(block: LegalBlock): string[] {
  if (typeof block === 'string') return [block];
  if ('list' in block) return block.list;
  if ('note' in block) return [block.note];
  return [...block.table.head, ...block.table.rows.flat()];
}

test('каталог и тексты документов совпадают', () => {
  assert.deepEqual(LEGAL_CATALOG.map((doc) => doc.slug).sort(), Object.keys(LEGAL_DOCS).sort());
  for (const meta of LEGAL_CATALOG) {
    const doc = LEGAL_DOCS[meta.slug];
    assert.equal(doc.title, meta.title, `title у ${meta.slug}`);
    assert.equal(doc.lang, meta.lang, `lang у ${meta.slug}`);
    assert.equal(doc.summary, meta.summary, `summary у ${meta.slug}`);
  }
});

test('внутренние ссылки ведут на существующие документы, id разделов уникальны', () => {
  for (const doc of Object.values(LEGAL_DOCS)) {
    const ids = doc.sections.map((section) => section.id);
    assert.equal(new Set(ids).size, ids.length, `повтор id раздела в ${doc.slug}`);
    const texts = [...(doc.intro ?? []), ...doc.sections.flatMap((section) => section.blocks)].flatMap(blockTexts);
    for (const text of texts) {
      for (const [, href] of text.matchAll(/\[\[([^\]|]+)\|/g)) {
        const slug = href.replace(/^\/about\/legal\/?/, '');
        assert.ok(href === '/about/legal' || slug in LEGAL_DOCS, `битая ссылка ${href} в ${doc.slug}`);
      }
    }
  }
});

test('версия согласия при регистрации совпадает с документом', () => {
  assert.equal(LEGAL_DOCS.consent.version, LEGAL_CONSENT_VERSION);
});
