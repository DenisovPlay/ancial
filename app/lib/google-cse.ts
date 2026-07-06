export interface GoogleCseElement {
  execute: (query: string) => void;
}

interface GoogleCseSearchControllerOptions {
  clearIntervalFn?: (id: number) => void;
  getElement: () => GoogleCseElement | null;
  intervalMs?: number;
  setIntervalFn?: (callback: () => void, delayMs: number) => number;
}

export function createGoogleCseSearchController(options: GoogleCseSearchControllerOptions) {
  const clearIntervalFn = options.clearIntervalFn ?? ((id: number) => window.clearInterval(id));
  const setIntervalFn = options.setIntervalFn ?? ((callback: () => void, delayMs: number) => window.setInterval(callback, delayMs));
  const intervalMs = options.intervalMs ?? 100;

  let activeIntervalId: number | null = null;
  let latestQuery = '';

  const stopRetryLoop = () => {
    if (activeIntervalId !== null) {
      clearIntervalFn(activeIntervalId);
      activeIntervalId = null;
    }
  };

  const tryExecute = () => {
    if (!latestQuery) {
      return false;
    }

    const element = options.getElement();
    if (!element) {
      return false;
    }

    element.execute(latestQuery);
    return true;
  };

  const scheduleRetryLoop = () => {
    stopRetryLoop();

    activeIntervalId = setIntervalFn(() => {
      if (tryExecute()) {
        stopRetryLoop();
      }
    }, intervalMs);
  };

  return {
    dispose() {
      stopRetryLoop();
    },

    notifyScriptReady() {
      if (!latestQuery) {
        return;
      }

      if (!tryExecute()) {
        scheduleRetryLoop();
      }
    },

    syncQuery(query: string) {
      latestQuery = query.trim();
      stopRetryLoop();

      if (!latestQuery) {
        return;
      }

      if (!tryExecute()) {
        scheduleRetryLoop();
      }
    },
  };
}
