interface ProductCategoryLike {
  name?: string;
  url_key?: string;
  url_path?: string;
}

interface ProductLike {
  sku?: string;
  name?: string;
  url_key?: string;
  categories?: ProductCategoryLike[];
}

const BRAND_SLUGS = [
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
] as const;

const BRAND_ALIASES: Record<string, string> = {
  redmagic: 'red-magic',
  'red-magic': 'red-magic',
  tainghe: 'tai-nghe',
  'tai-nghe': 'tai-nghe',
  'tai nghe': 'tai-nghe',
  phukien: 'phu-kien',
  'phu-kien': 'phu-kien',
  'phu kien': 'phu-kien',
};

const LEGACY_BRAND_SUFFIX_REGEX = /-brand-(apple|iphone|samsung|xiaomi|oppo|oneplus|vivo|asus|red-magic)(?:-\d{1,4})?$/;

function normalizeAscii(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

function slugifySegment(input: string): string {
  return normalizeAscii(input)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeProductSlug(raw: string): string {
  const slug = slugifySegment(raw);
  if (!slug) {
    return '';
  }

  const cleaned = slug.replace(LEGACY_BRAND_SUFFIX_REGEX, '').replace(/-+$/g, '');
  return cleaned || slug;
}

function toKnownBrandSlug(raw: string): string | null {
  const normalized = normalizeAscii(raw);
  if (!normalized) {
    return null;
  }

  const direct = slugifySegment(normalized);
  if ((BRAND_SLUGS as readonly string[]).includes(direct)) {
    return direct;
  }

  const alias = BRAND_ALIASES[normalized] || BRAND_ALIASES[direct] || BRAND_ALIASES[normalized.replace(/\s+/g, '')];
  if (alias) {
    return alias;
  }

  return null;
}

function inferBrandFromCategories(categories?: ProductCategoryLike[]): string | null {
  if (!categories?.length) {
    return null;
  }

  for (const category of categories) {
    const candidates: string[] = [];

    if (category.url_key) {
      candidates.push(category.url_key);
    }

    if (category.url_path) {
      candidates.push(category.url_path);
      for (const segment of category.url_path.split('/')) {
        candidates.push(segment);
      }
    }

    if (category.name) {
      candidates.push(category.name);
    }

    for (const candidate of candidates) {
      const brandSlug = toKnownBrandSlug(candidate);
      if (brandSlug) {
        return brandSlug;
      }
    }
  }

  return null;
}

function inferBrandFromText(product: ProductLike): string {
  const normalized = normalizeAscii(`${product.name || ''} ${product.sku || ''}`);

  if (normalized.includes('samsung') || normalized.includes('galaxy')) return 'samsung';
  if (normalized.includes('iphone') || normalized.includes('apple')) return 'apple';
  if (normalized.includes('xiaomi') || normalized.includes('redmi') || normalized.includes('poco')) return 'xiaomi';
  if (normalized.includes('oneplus') || normalized.includes('one plus')) return 'oneplus';
  if (normalized.includes('oppo')) return 'oppo';
  if (normalized.includes('vivo')) return 'vivo';
  if (normalized.includes('red magic') || normalized.includes('redmagic')) return 'red-magic';
  if (normalized.includes('asus') || normalized.includes('rog')) return 'asus';

  if (
    normalized.includes('tai nghe') ||
    normalized.includes('headphone') ||
    normalized.includes('airpods') ||
    normalized.includes('earbuds')
  ) {
    return 'tai-nghe';
  }

  if (
    normalized.includes('phu kien') ||
    normalized.includes('charger') ||
    normalized.includes('adapter') ||
    normalized.includes('cap ') ||
    normalized.includes('magsafe') ||
    normalized.includes('mag safe') ||
    normalized.includes('power bank')
  ) {
    return 'phu-kien';
  }

  return 'phu-kien';
}

function resolveAccessoryBrand(product: ProductLike): string | null {
  const categoryText = (product.categories || [])
    .map((cat) => `${cat.name || ''} ${cat.url_key || ''} ${cat.url_path || ''}`)
    .join(' ');
  const normalized = normalizeAscii(`${categoryText} ${product.name || ''}`);

  if (
    normalized.includes('tai nghe') ||
    normalized.includes('headphone') ||
    normalized.includes('earbud') ||
    normalized.includes('earbuds') ||
    normalized.includes('airpod')
  ) {
    return 'tai-nghe';
  }

  if (
    normalized.includes('phu kien') ||
    normalized.includes('charger') ||
    normalized.includes('adapter') ||
    normalized.includes('cap ') ||
    normalized.includes('cable') ||
    normalized.includes('magsafe') ||
    normalized.includes('mag safe') ||
    normalized.includes('power bank')
  ) {
    return 'phu-kien';
  }

  return null;
}

export function resolveProductBrandSlug(product: ProductLike): string {
  return (
    resolveAccessoryBrand(product) ||
    inferBrandFromCategories(product.categories) ||
    inferBrandFromText(product)
  );
}

export function resolveProductSlug(product: ProductLike): string {
  if (product.name && product.name.trim()) {
    const slug = normalizeProductSlug(product.name);
    if (slug) {
      return slug;
    }
  }

  if (product.url_key && product.url_key.trim()) {
    const slug = normalizeProductSlug(product.url_key);
    if (slug) {
      return slug;
    }
  }

  return slugifySegment(product.sku || 'san-pham');
}

export function buildProductPath(product: ProductLike, brandOverride?: string): string {
  const brandSlug = brandOverride || resolveProductBrandSlug(product);
  const productSlug = resolveProductSlug(product);
  return `/${brandSlug}/${productSlug}`;
}
