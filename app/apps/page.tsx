import type { Metadata } from 'next';

import { createPageMetadata } from '../seo';
import AppsContent from './apps-content';

export const metadata: Metadata = createPageMetadata({
  canonical: '/apps',
  description: 'Играйте прямо здесь!',
  title: 'ZYNT',
});

export default function AppsPage() {
  return <AppsContent mode="home" />;
}
