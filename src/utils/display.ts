export function displayName(
  item: { name_source?: string; name_product?: string; code?: string }
): string {
  return item.name_product || item.name_source || item.code || '';
}

export function displaySource(
  item: { name_source?: string; code?: string }
): string {
  return item.name_source || item.code || '';
}

const CATEGORY_COLOR_VAR_MAP: Record<string, string> = {
  cable: 'var(--color-cable)',
  szu: 'var(--color-szu)',
  bzu: 'var(--color-bzu)',
  azu: 'var(--color-azu)',
  headphones: 'var(--color-headphones)',
  adapter: 'var(--color-adapter)',
  pin: 'var(--color-pin)',
  holder: 'var(--color-holder)',
  case: 'var(--color-case)',
  kit: 'var(--color-kit)',
  blogo: 'var(--color-blogo)',
};

export function getCategoryColorVar(code: string): string {
  return CATEGORY_COLOR_VAR_MAP[code] || 'var(--color-accent)';
}

export function displayProductName(item: { productName?: string }): string {
  return item.productName || '';
}

export function getColorHexValue(hexValue: string): string {
  return hexValue === 'gradient'
    ? 'conic-gradient(#ff0000 0deg 18deg, #ff7f00 18deg 54deg, #ffff00 54deg 90deg, #80ff00 90deg 126deg, #00ff00 126deg 162deg, #00ffff 162deg 198deg, #0000ff 198deg 234deg, #8000ff 234deg 270deg, #ff00ff 270deg 306deg, #ff007f 306deg 342deg, #ff0000 342deg 360deg)'
    : hexValue;
}
