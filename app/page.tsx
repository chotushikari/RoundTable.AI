import type { Metadata } from 'next';
import { MarketingLanding } from '@/components/marketing/MarketingLanding';

export const metadata: Metadata = {
  title: 'RoundTable — the interview panel that shares one brain',
  description:
    'One live, adaptive voice interview with five perspectives — technical, product, customer, hiring manager, behavioural — over a single shared read of your work.',
};

export default function Home() {
  return <MarketingLanding />;
}
