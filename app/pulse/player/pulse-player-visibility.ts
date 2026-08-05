export type PulsePlayerVisibilityMode = 'full' | 'mini';

export function shouldRunPulseFullPlayerWork(
  mode: PulsePlayerVisibilityMode,
  isVisible: boolean,
  isMounted: boolean,
): boolean {
  return mode === 'full' && isVisible && isMounted;
}
