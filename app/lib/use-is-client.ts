import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

/** false на сервере и при гидратации, true после неё: позволяет читать браузерное состояние без рассинхрона разметки. */
export function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
