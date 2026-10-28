let switchLabel: HTMLLabelElement | null = null;

/** iOS Safari/WKWebView (17.4+) не даёт Vibration API, но щёлкает при переключении `<input type="checkbox" switch">` — используем это. */
function iosSwitchHaptic() {
  if (!switchLabel) {
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;left:-100px;top:-100px;width:1px;height:1px;opacity:0;pointer-events:none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    label.append(input);
    document.body.append(label);
    switchLabel = label;
  }
  switchLabel.click();
}

/**
 * Короткая тактильная отдача: `tick` — лёгкий щелчок (порог жеста), `confirm` — подтверждение действия.
 * Android — вибрация; iPhone — системный щелчок переключателя (срабатывает из обработчиков касаний, где есть жест пользователя).
 */
export function haptic(kind: 'confirm' | 'tick' = 'tick') {
  if (typeof navigator === 'undefined' || typeof document === 'undefined') return;
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(kind === 'tick' ? 10 : [18, 30, 18]);
      return;
    }
    iosSwitchHaptic();
  } catch {
    // Тактильная отдача — украшение: без неё всё работает.
  }
}
