import type {
  Marketplace,
  MarketplaceEntityCode,
  MarketplaceSku,
  ProductWithRelations,
} from '@app-types';

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

export const ENTITY_LABELS: Record<MarketplaceEntityCode, string> = {
  kua: 'КЮА',
  kaa: 'КАА',
  dev: 'ДЕВ',
  bms: 'БМС',
};

export const ENTITY_ORDER: MarketplaceEntityCode[] = ['kua', 'kaa', 'dev', 'bms'];

export function groupMarketplaceSkusByMarketplace(
  skus: MarketplaceSku[]
): Record<Marketplace, MarketplaceSku[]> {
  const groups: Record<Marketplace, MarketplaceSku[]> = { wb: [], ozon: [] };
  for (const sku of skus) {
    groups[sku.marketplace].push(sku);
  }
  return groups;
}

export function findMarketplaceSku(
  skus: MarketplaceSku[],
  marketplace: Marketplace,
  entity: MarketplaceEntityCode
): MarketplaceSku | undefined {
  return skus.find((s) => s.marketplace === marketplace && s.entity === entity);
}

export function getProductMarketplaceSearchText(product: ProductWithRelations): string {
  return (product.marketplaceSkus || [])
    .map((s) => `${s.article} ${s.title} ${ENTITY_LABELS[s.entity]} ${s.entity}`)
    .join(' ')
    .toLowerCase();
}
