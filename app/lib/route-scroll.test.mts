import assert from 'node:assert/strict';
import test from 'node:test';

import { createRouteScrollController, scrollAppToTop } from './route-scroll.ts';

test('route scroll controller skips the initial route sync', () => {
  const events: string[] = [];
  const controller = createRouteScrollController({
    schedule: (callback) => callback(),
    scrollToTop: () => {
      events.push('scroll');
    },
  });

  controller.syncRoute('/feed');

  assert.deepEqual(events, []);
});

test('route scroll controller scrolls once when the route changes', () => {
  const events: string[] = [];
  const controller = createRouteScrollController({
    schedule: (callback) => callback(),
    scrollToTop: () => {
      events.push('scroll');
    },
  });

  controller.syncRoute('/feed');
  controller.syncRoute('/messages');

  assert.deepEqual(events, ['scroll']);
});

test('route scroll controller ignores duplicate route keys', () => {
  const events: string[] = [];
  const controller = createRouteScrollController({
    schedule: (callback) => callback(),
    scrollToTop: () => {
      events.push('scroll');
    },
  });

  controller.syncRoute('/feed');
  controller.syncRoute('/messages');
  controller.syncRoute('/messages');

  assert.deepEqual(events, ['scroll']);
});

test('scrollAppToTop resets known document and messages scroll containers', () => {
  const calls: Array<{ target: string; options: ScrollToOptions }> = [];
  const makeTarget = (target: string) => ({
    scrollLeft: 12,
    scrollTop: 48,
    scrollTo(options: ScrollToOptions) {
      calls.push({ target, options });
    },
  });

  const scrollingElement = makeTarget('scrollingElement');
  const mainContent = makeTarget('main-content');
  const dialogsPane = makeTarget('dialogs-pane');
  const dialogList = makeTarget('dialog-list-container');
  const msgScroll = makeTarget('msg-scroll');

  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      scrollTo(options: ScrollToOptions) {
        calls.push({ target: 'window', options });
      },
    },
  });

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      body: scrollingElement,
      documentElement: scrollingElement,
      scrollingElement,
      getElementById(id: string) {
        switch (id) {
          case 'main-content':
            return mainContent;
          case 'dialogs-pane':
            return dialogsPane;
          case 'dialog-list-container':
            return dialogList;
          case 'msg-scroll':
            return msgScroll;
          default:
            return null;
        }
      },
    },
  });

  try {
    scrollAppToTop('smooth');
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: previousWindow,
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: previousDocument,
    });
  }

  assert.deepEqual(
    calls.map(({ target }) => target),
    ['window', 'scrollingElement', 'main-content', 'dialogs-pane', 'dialog-list-container', 'msg-scroll'],
  );

  for (const target of [scrollingElement, mainContent, dialogsPane, dialogList, msgScroll]) {
    assert.equal(target.scrollTop, 0);
    assert.equal(target.scrollLeft, 0);
  }
});
