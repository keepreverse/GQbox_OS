import type { Marketplace } from '../../server/types';

const WB_BASE = 'https://www.wildberries.ru/catalog/0/search.aspx?search=';
const OZON_BASE = 'https://www.ozon.ru/search/?text=';

export function buildMarketplaceUrl(marketplace: Marketplace, article: string): string {
  if (!article) return '';
  if (marketplace === 'wb') return WB_BASE + encodeURIComponent(article);
  return OZON_BASE + encodeURIComponent(article);
}

export function marketplaceLabel(marketplace: Marketplace): string {
  return marketplace === 'wb' ? 'Wildberries' : 'Ozon';
}

export function marketplaceShort(marketplace: Marketplace): string {
  return marketplace === 'wb' ? 'WB' : 'Ozon';
}
