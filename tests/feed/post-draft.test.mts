import assert from 'node:assert/strict';
import test from 'node:test';

import { draftImagesFromState, draftImagesToState, isPostDraftEmpty, parsePostDraft } from '../../app/feed/post-draft.ts';

test('пустой черновик: только автор и тема — не считаются', () => {
  assert.equal(isPostDraftEmpty({ content: ' ', images: [], title: '', widgets: [] }), true);
  assert.equal(isPostDraftEmpty({ content: 'привет', images: [], title: '', widgets: [] }), false);
  assert.equal(isPostDraftEmpty({ content: '', images: [{ id: 'a', url: 'u' }], title: '', widgets: [] }), false);
  assert.equal(isPostDraftEmpty({ content: '', images: [], title: '', widgets: [{ type: 'poll' }] }), false);
});

test('parsePostDraft отбрасывает мусор и чинит поля', () => {
  assert.equal(parsePostDraft(null), null);
  assert.equal(parsePostDraft({ content: 'x' }), null);
  const draft = parsePostDraft({
    token: 't1',
    content: 5,
    images: [{ id: 'a', url: 'u' }, { id: 1 }, null],
    widgets: [{ type: 'poll' }, { type: 'evil' }, 'x'],
    activeTab: 'preview',
  });
  assert.deepEqual(draft, {
    activeTab: 'preview',
    authorId: '0',
    content: '',
    images: [{ id: 'a', url: 'u' }],
    title: '',
    token: 't1',
    topic: '',
    widgets: [{ type: 'poll' }],
  });
});

test('в черновик попадают только загруженные картинки, и они восстанавливаются как загруженные', () => {
  const saved = draftImagesFromState([
    { id: '1', previewUrl: 'blob:1', status: 'uploaded', uploadedUrl: 'https://cdn/1.jpg' },
    { id: '2', previewUrl: 'blob:2', status: 'uploading' },
    { id: '3', previewUrl: 'blob:3', status: 'error' },
  ]);
  assert.deepEqual(saved, [{ id: '1', url: 'https://cdn/1.jpg' }]);
  assert.deepEqual(draftImagesToState(saved), [
    { id: '1', previewUrl: 'https://cdn/1.jpg', status: 'uploaded', uploadedUrl: 'https://cdn/1.jpg' },
  ]);
});

import { parsePostDraftPayload, serializePostDraftPayload } from '../../app/feed/post-draft.ts';

test('payload для синхронизации: пустой черновик — пустая строка, иначе круговой обмен без потерь', () => {
  const empty = { content: '', images: [], title: '', topic: 'IT', widgets: [] };
  assert.equal(serializePostDraftPayload(empty), '');
  const draft = { content: 'привет', images: [{ id: 'a', url: 'u' }], title: 'Заг', topic: 'IT', widgets: [{ type: 'poll' }] };
  assert.deepEqual(parsePostDraftPayload(serializePostDraftPayload(draft)), draft);
  assert.equal(parsePostDraftPayload(''), null);
  assert.equal(parsePostDraftPayload('не json'), null);
});
