'use client';

import dynamic from 'next/dynamic';

import { IS_NATIVE_APP } from '../lib/platform';

/**
 * Нативная обвязка только для сборки приложения. Статический импорт AppRuntime в layout (серверный
 * компонент) тянул его код в общий клиентский чанк сайта, даже когда он не рендерится; здесь в веб-сборке
 * условие сворачивается в null, и код приложения остаётся в отдельном чанке, который сайт не грузит.
 */
const AppRuntime = IS_NATIVE_APP ? dynamic(() => import('./app-runtime'), { ssr: false }) : null;

export default function AppRuntimeSlot() {
  return AppRuntime ? <AppRuntime /> : null;
}
