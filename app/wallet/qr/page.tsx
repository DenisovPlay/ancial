import type { Metadata } from 'next';
import QRContent from './qr-content';
import { createPageMetadata } from '../../seo';

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    canonical: `/wallet/qr`,
    description: `Сканируйте QR-коды для быстрых переводов и платежей.`,
    title: `QR Сканер`,
  });
}

export default function QRPage() {
  return <QRContent />;
}
