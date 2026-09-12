import type { Metadata } from 'next';

import { createPageMetadata } from '../seo';
import AppsContent from './apps-content';

export const metadata: Metadata = createPageMetadata({
  canonical: '/apps',
  description: 'Играйте прямо здесь!',
  title: 'ZYNT',
});

// AppsContent's mode/category and query state depend on useSearchParams; static
// generation causes a hydration mismatch in prod when the URL carries real query params.
export const dynamic = 'force-dynamic';

export default function AppsPage() {
  return <AppsContent />;
}
