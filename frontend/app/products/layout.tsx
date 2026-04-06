import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shop Mobile Phones | Mobile Store',
  description: 'Browse our collection of mobile phones from top brands including iPhone, Samsung, and Xiaomi.',
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
