import { Suspense } from 'react';
import CallClient from './call-client';
import { AppRouteGate } from '../../components/app-route-shell';
import { appShellStaticParams } from '../../lib/app-shell-params';
import BrandLoader from '../../components/brand-loader';

// Приложение: одна страница-заготовка, параметр берётся из адреса (app-routes.ts).
export const generateStaticParams = appShellStaticParams({ hash: 'param' });

export const metadata = {
  title: 'Call',
};

export default function CallPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh w-full items-center justify-center bg-black"><BrandLoader /></div>}>
      <AppRouteGate>
        <CallClient />
      </AppRouteGate>
    </Suspense>
  );
}
