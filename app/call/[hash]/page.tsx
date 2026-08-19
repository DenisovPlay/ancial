import { Suspense } from 'react';
import CallClient from './call-client';

export const metadata = {
  title: 'Call',
};

export default function CallPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-black"><span className="text-white">Loading...</span></div>}>
      <CallClient />
    </Suspense>
  );
}
