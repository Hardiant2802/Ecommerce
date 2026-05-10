import { notFound } from 'next/navigation';
import ProductDetailClient from '@/components/product/ProductDetailClient';

export const runtime = 'nodejs';

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

interface BrandProductDetailPageProps {
  params: Promise<{
    brand: string;
    slug: string;
  }>;
}

export default async function BrandProductDetailPage({ params }: BrandProductDetailPageProps) {
  const { brand, slug } = await params;

  if (!ALLOWED_BRANDS.has(brand)) {
    notFound();
  }

  return <ProductDetailClient slug={slug} brand={brand} />;
}
