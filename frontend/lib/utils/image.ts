interface ProductImageRef {
  url: string;
  label?: string;
  position?: number;
  disabled?: boolean;
}

interface ProductImageSource {
  image?: ProductImageRef;
  media_gallery?: ProductImageRef[];
  updated_at?: string;
}

export function withImageVersion(url?: string, version?: string): string {
  if (!url) {
    return '/images/placeholder.svg';
  }

  let normalizedUrl = url;

  // Use original media path instead of Magento resized cache path to avoid stale cached images.
  normalizedUrl = normalizedUrl.replace(
    /\/media\/catalog\/product\/cache\/[^/]+\//,
    '/media/catalog/product/'
  );

  const apiBaseUrl = process.env.NEXT_PUBLIC_MAGENTO_API_URL;
  if (apiBaseUrl && normalizedUrl.startsWith('http')) {
    try {
      const parsedImageUrl = new URL(normalizedUrl);
      const parsedApiUrl = new URL(apiBaseUrl);

      const apiHost = parsedApiUrl.hostname.toLowerCase();
      const isLocalApiHost = apiHost === 'localhost' || apiHost === '127.0.0.1' || apiHost === '0.0.0.0';

      // Never rewrite image host to local addresses in deployed environments.
      if (!isLocalApiHost) {
        parsedImageUrl.protocol = parsedApiUrl.protocol;
        parsedImageUrl.host = parsedApiUrl.host;
        normalizedUrl = parsedImageUrl.toString();
      }
    } catch {
      // Keep the original URL when parsing fails.
    }
  }

  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    return normalizedUrl;
  }

  try {
    const parsedUrl = new URL(normalizedUrl);

    // Custom domain now serves frontend Pages, while Magento media files are on www subdomain.
    if (
      parsedUrl.hostname.toLowerCase() === 'ahphonestore.id.vn' &&
      parsedUrl.pathname.startsWith('/media/catalog/product/')
    ) {
      parsedUrl.hostname = 'www.ahphonestore.id.vn';
    }

    if (version) {
      parsedUrl.searchParams.set('v', version);
    }

    const isLocalHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsedUrl.hostname);
    const isPublicHttpsImage = parsedUrl.protocol === 'https:' && !isLocalHost;

    // For public HTTPS images, use direct URL to avoid proxy bottlenecks and intermittent worker failures.
    if (isPublicHttpsImage) {
      return parsedUrl.toString();
    }

    normalizedUrl = parsedUrl.toString();
  } catch {
    // If URL parsing fails, keep the existing proxy fallback behavior below.
  }

  const proxyParams = new URLSearchParams({
    url: normalizedUrl,
  });

  if (version) {
    proxyParams.set('v', version);
  }

  return `/api/media?${proxyParams.toString()}`;
}

export function getPrimaryProductImageUrl(product: ProductImageSource): string {
  const gallery = (product.media_gallery || [])
    .filter((item) => Boolean(item?.url) && !item?.disabled)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const roleImageUrl = product.image?.url;
  const roleIsPlaceholder = Boolean(
    roleImageUrl && roleImageUrl.includes('/Magento_Catalog/images/product/placeholder/')
  );

  const sourceUrl = !roleIsPlaceholder && roleImageUrl
    ? roleImageUrl
    : (gallery[0]?.url || roleImageUrl);

  return withImageVersion(sourceUrl, product.updated_at);
}