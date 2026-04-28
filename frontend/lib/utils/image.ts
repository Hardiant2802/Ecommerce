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
  if (normalizedUrl.startsWith('//')) {
    normalizedUrl = `https:${normalizedUrl}`;
  }

  if (apiBaseUrl && normalizedUrl.startsWith('/')) {
    try {
      normalizedUrl = new URL(normalizedUrl, apiBaseUrl).toString();
    } catch {
      // Keep original when base URL is invalid.
    }
  }

  if (apiBaseUrl && normalizedUrl.startsWith('http')) {
    try {
      const parsedImageUrl = new URL(normalizedUrl);
      const parsedApiUrl = new URL(apiBaseUrl);
      const shouldUseApiHost =
        parsedImageUrl.pathname.startsWith('/media/catalog/product/') ||
        parsedImageUrl.pathname.includes('/Magento_Catalog/images/product/placeholder/');

      if (shouldUseApiHost) {
        parsedImageUrl.protocol = parsedApiUrl.protocol;
        parsedImageUrl.host = parsedApiUrl.host;
        normalizedUrl = parsedImageUrl.toString();
      }
    } catch {
      // Keep the original URL when parsing fails.
    }
  }

  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    return '/images/placeholder.svg';
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    const imageHost = parsedUrl.hostname.toLowerCase();
    const path = parsedUrl.pathname;

    const isMagentoPlaceholder = path.includes('/Magento_Catalog/images/product/placeholder/');
    if (isMagentoPlaceholder) {
      return '/images/placeholder.svg';
    }

    // Some Magento environments may still emit local or old media URLs in GraphQL.
    // Force them to public media host so browser can fetch images on deployed domains.
    if (
      (imageHost === 'magento.test' || imageHost === 'magento.ahphonestore.id.vn') &&
      parsedUrl.pathname.startsWith('/media/catalog/product/')
    ) {
      parsedUrl.protocol = 'https:';
      parsedUrl.hostname = 'www.ahphonestore.id.vn';
      parsedUrl.port = '';
    }

    const isLocalHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsedUrl.hostname);
    const isDevAliasHost = imageHost.endsWith('.test') || imageHost.endsWith('.local');

    // Local Magento media is commonly served over HTTP even when GraphQL URL is HTTPS.
    // Force localhost image requests to HTTP to avoid self-signed cert issues in dev.
    if (isLocalHost && parsedUrl.protocol === 'https:') {
      parsedUrl.protocol = 'http:';
      if (parsedUrl.port === '443') {
        parsedUrl.port = '';
      }
    }

    if (version) {
      parsedUrl.searchParams.set('v', version);
    }

    const isPublicHttpsImage = parsedUrl.protocol === 'https:' && !isLocalHost && !isDevAliasHost;

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
