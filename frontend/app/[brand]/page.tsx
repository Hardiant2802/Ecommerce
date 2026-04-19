import { notFound } from 'next/navigation';
import ProductsPageContent from '@/components/product/ProductsPageContent';

export const runtime = 'edge';

const ALLOWED_BRANDS = new Set([
  'apple',
  'iphone',
  'samsung',
  'xiaomi',
  'oppo',
  'oneplus',
  'vivo',
  'asus',
  'red-magic',
  'tai-nghe',
  'phu-kien',
]);

interface BrandPageProps {
  params: Promise<{
    brand: string;
  }>;
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { brand } = await params;

  if (!ALLOWED_BRANDS.has(brand)) {
    notFound();
  }

  return <ProductsPageContent forcedBrand={brand} />;
}
