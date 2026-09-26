/**
 * Сравнение версий приложения вида 3.8.2b (как в package.json): числа по порядку, буква — младший разряд.
 * < 0 — a старше… точнее, a меньше b; 0 — равны; > 0 — a больше. Без импортов — для node-тестов.
 */
export function compareAppVersions(a: string, b: string): number {
  const parse = (value: string) => {
    const match = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?([a-z]?)/i.exec(String(value).trim());
    if (!match) return null;
    const letter = match[4] ? match[4].toLowerCase().charCodeAt(0) - 96 : 0;
    return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0), letter];
  };
  const left = parse(a);
  const right = parse(b);
  if (!left || !right) return 0;
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
}
