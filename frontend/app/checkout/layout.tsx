import { ReactNode } from 'react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface CheckoutLayoutProps {
  children: ReactNode;
}

export default function CheckoutLayout({ children }: CheckoutLayoutProps) {
  return children;
}
