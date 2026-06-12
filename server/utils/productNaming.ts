// ─── Server-side product name generation (mirrors client hydrateProduct) ───
// Generates product_name from dictionaries + raw specs, so DB seed stores
// human-readable names instead of NULL.

import type { RawProduct, DictionaryItem } from '../types';

interface DictMap {
  categories: Map<string, DictionaryItem>;
  models: Map<string, DictionaryItem>;
  colors: Map<string, DictionaryItem>;
  connectors: Map<string, DictionaryItem>;
}

export function buildDictMaps(items: DictionaryItem[]): Map<string, DictionaryItem> {
  const m = new Map<string, DictionaryItem>();
  for (const item of items) {
    if (item.id) m.set(item.id, item);
  }
  return m;
}

export function generateProductName(
  raw: RawProduct,
  dicts: DictMap
): string {
  const category = raw.categoryId ? dicts.categories.get(raw.categoryId) : undefined;
  const model = raw.modelId ? dicts.models.get(raw.modelId) : undefined;
  const color = raw.colorId ? dicts.colors.get(raw.colorId) : undefined;
  const connectorFemale = raw.connectorFemaleId ? dicts.connectors.get(raw.connectorFemaleId) : undefined;
  const connectorMale = raw.connectorMaleId ? dicts.connectors.get(raw.connectorMaleId) : undefined;

  const parts: string[] = [];
  if (category?.name_product) parts.push(category.name_product + '.');
  if (connectorFemale && connectorMale) {
    parts.push(`${connectorFemale.name_product}-${connectorMale.name_product}`);
  } else if (connectorFemale) {
    parts.push(connectorFemale.name_product ?? '');
  } else if (connectorMale) {
    parts.push(connectorMale.name_product ?? '');
  }
  if (model?.name_product) parts.push(model.name_product);
  if (typeof raw.powerW === 'number') parts.push(`${raw.powerW}W`);
  if (typeof raw.lengthM === 'number') parts.push(`${raw.lengthM}м`);
  if (color?.name_product) parts.push(color.name_product);

  return parts.join(' ') || raw.sku || raw.id;
}
