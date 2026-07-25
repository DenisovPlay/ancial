import type { Metadata } from 'next';
import { createPageMetadata } from '../seo';
import AboutContent from './about-content';

export const metadata: Metadata = createPageMetadata({
  title: 'О проекте',
  description: 'Узнайте больше об Zypo — история развития, технологии, контакты и документация.',
  keywords: ['о проекте', 'история', 'команда', 'технологии', 'Ancial'],
  canonical: '/about',
});

export default function AboutPage() {
  return <AboutContent />;
}
