// ─── Общие типы для backend-роутов ────────────────────────────────────────
// Эти типы описывают «канонический» camelCase-формат, который
// возвращают и принимают API в обоих режимах (demo/dev).
//
// DB внутри хранит snake_case, JSON-файлы хранят camelCase
// (как их пишет seed-data.ts). Маппинг делается в mappers.ts.

export interface RawProduct {
  id: string;
  sku: string;
  skuBase?: string | null;
  categoryId?: string | null;
  modelId?: string | null;
  colorId?: string | null;
  supplierId?: string | null;
  bodyMaterialId?: string | null;
  wireMaterialId?: string | null;
  currentA?: number | null;
  voltageV?: number | null;
  powerW?: number | null;
  lengthM?: number | null;
  dataTransferMbps?: number | null;
  deviceCount?: number | null;
  connectorFemaleId?: string | null;
  connectorMaleId?: string | null;
  variantCode?: string | null;
  lengthVariant?: string | null;
  supplierSuffix?: string | null;
  isKit?: boolean | null;
  isActive?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type DictType =
  | 'categories'
  | 'models'
  | 'colors'
  | 'suppliers'
  | 'connectors'
  | 'chargingProtocols'
  | 'materials';

export const DICT_TYPES: readonly DictType[] = [
  'categories',
  'models',
  'colors',
  'suppliers',
  'connectors',
  'chargingProtocols',
  'materials',
] as const;

export interface DictionaryItem {
  id: string;
  code?: string | null;
  name_source?: string | null;
  name_product?: string | null;
  name?: string | null;
  nameRu?: string | null;
  categoryId?: string | null;
  parentId?: string | null;
  hex?: string | null;
  hexValue?: string | null;
  shortName?: unknown;
  sortOrder?: number;
  color?: string | null;
  icon?: string | null;
  description?: string | null;
  contactInfo?: string | null;
  [key: string]: unknown;
}

export type DataBundle = {
  products: RawProduct[];
  categories: DictionaryItem[];
  models: DictionaryItem[];
  colors: DictionaryItem[];
  suppliers: DictionaryItem[];
  connectors: DictionaryItem[];
  chargingProtocols: DictionaryItem[];
  materials: DictionaryItem[];
};

export const COLLECTIONS = [
  'products',
  'categories',
  'models',
  'colors',
  'suppliers',
  'connectors',
  'chargingProtocols',
  'materials',
] as const;
export type CollectionName = (typeof COLLECTIONS)[number];

export function isDictType(t: string): t is DictType {
  return (DICT_TYPES as readonly string[]).includes(t);
}
