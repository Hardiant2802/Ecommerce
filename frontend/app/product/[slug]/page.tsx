import ProductDetailClient from '@/components/product/ProductDetailClient';

export const runtime = 'nodejs';

interface ProductDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  return <ProductDetailClient slug={slug} />;
}
