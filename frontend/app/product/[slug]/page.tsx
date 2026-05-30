import ProductDetailClient from '@/components/product/ProductDetailClient';
import { normalizeProductSlug } from '@/lib/utils/productRouting';

export const runtime = 'nodejs';

interface ProductDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const normalizedSlug = normalizeProductSlug(slug);
  return <ProductDetailClient slug={normalizedSlug || slug} />;
}
