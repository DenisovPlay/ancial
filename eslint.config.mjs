import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // <img> — осознанная архитектура проекта:
      //  - SW кэширует изображения Stale-While-Revalidate (ancial-images-v1) независимо
      //    от того, через /_next/image они запрошены или напрямую;
      //  - динамические источники (blob: из IndexedDB, стикеры 7tv, аватары вне remotePatterns)
      //    next/image не поддерживает без unoptimized-обходов;
      //  - перевод 126 мест на next/image менял бы DOM (srcset/sizes/wrapper) — риск
      //    визуального регресса при нулевом выигрыше для офлайн-стратегии.
      // Warning (не error): новые места всё же видны в выводе, но не ломают CI-ratchet.
      "@next/next/no-img-element": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "php-v2-api/**",
    "public/jsQR.js",
  ]),
]);

export default eslintConfig;
