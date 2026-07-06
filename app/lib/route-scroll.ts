export interface RouteScrollControllerOptions {
  schedule?: (callback: () => void) => void;
  scrollToTop: () => void;
}

type ScrollTarget = {
  scrollTo?: (options: ScrollToOptions) => void;
  scrollTop?: number;
  scrollLeft?: number;
};

export function createRouteScrollController(options: RouteScrollControllerOptions) {
  let hasSyncedInitialRoute = false;
  let previousRouteKey: null | string = null;

  return {
    syncRoute(routeKey: string) {
      if (!hasSyncedInitialRoute) {
        hasSyncedInitialRoute = true;
        previousRouteKey = routeKey;
        return;
      }

      if (previousRouteKey === routeKey) {
        return;
      }

      previousRouteKey = routeKey;

      if (options.schedule) {
        options.schedule(options.scrollToTop);
        return;
      }

      options.scrollToTop();
    },
  };
}

function scrollTargetToTop(target: ScrollTarget | null | undefined, options: ScrollToOptions) {
  if (!target) {
    return;
  }

  target.scrollTo?.(options);

  if (typeof target.scrollTop === 'number') {
    target.scrollTop = 0;
  }

  if (typeof target.scrollLeft === 'number') {
    target.scrollLeft = 0;
  }
}

export function scrollAppToTop(behavior: ScrollBehavior = 'smooth') {
  if (typeof window === 'undefined') {
    return;
  }

  const scrollOptions: ScrollToOptions = { top: 0, left: 0, behavior };

  window.scrollTo(scrollOptions);

  const targets = [
    document.scrollingElement,
    document.documentElement,
    document.body,
    document.getElementById('main-content'),
    document.getElementById('dialogs-pane'),
    document.getElementById('dialog-list-container'),
    document.getElementById('msg-scroll'),
  ];

  const seenTargets = new Set<ScrollTarget>();
  for (const target of targets) {
    if (!target || seenTargets.has(target)) {
      continue;
    }

    seenTargets.add(target);
    scrollTargetToTop(target, scrollOptions);
  }
}
