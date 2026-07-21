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
  productName?: string | null;
  isKit?: boolean | null;
  connectionType?: string | null;
  chargingProtocolId?: string | null;
  isActive?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  marketplaceSkus?: MarketplaceSku[] | null;
}

export interface RawKitComponent {
  kitId: string;
  componentId: string;
  quantity: number;
  sortOrder?: number;
}

/**
 * Уникальный медиафайл (фото или видео) в хранилище.
 * Файл лежит на диске в `server/uploads/` или на NAS.
 * В БД/JSON хранится только относительный URL вида `/uploads/<file>`.
 */
export interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
}

/**
 * Связь медиафайла с вариантом товара (M:N).
 */
export interface MediaLink {
  fileId: string;
  variantId: string;
  isPrimary: boolean;
  sortOrder: number;
  uploadedAt: string;
}

/** @deprecated используйте MediaFile + MediaLink */
export interface RawProductMedia {
  id: string;
  variantId: string;
  mediaType: 'image' | 'video';
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  isPrimary: boolean;
  sortOrder: number;
  uploadedAt: string;
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
  color?: string | null;
  shortName?: unknown;
  sortOrder?: number;
  icon?: string | null;
  description?: string | null;
  contactInfo?: string | null;
  [key: string]: unknown;
}

// ─── Marketplace SKUs (WB, Ozon) ──────────────────────────────────────────
export type Marketplace = 'wb' | 'ozon';
export type MarketplaceEntityCode = 'kua' | 'kaa' | 'dev' | 'bms';
export type MarketplaceListingKind = 'single' | 'bundle';

export interface MarketplaceSku {
  marketplace: Marketplace;
  entity: MarketplaceEntityCode;
  article: string;
  kind: MarketplaceListingKind;
  title: string;
}

export interface MarketplaceListing {
  id: string;
  marketplace: Marketplace;
  entity: MarketplaceEntityCode;
  article: string;
  title: string;
  kind: MarketplaceListingKind;
  skus: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SkuListing {
  id: string;
  sku: string;
  marketplace: Marketplace;
  entity: MarketplaceEntityCode;
  article: string;
  kind: MarketplaceListingKind;
  listingId?: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
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
  kitComponents: RawKitComponent[];
  productMedia: RawProductMedia[];
  mediaFiles: MediaFile[];
  mediaLinks: MediaLink[];
  marketplaceListings: MarketplaceListing[];
  skuListings: SkuListing[];
};

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  displayName: string;
  login: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface NotificationRow {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
  unread: boolean;
  type: string;
  actionView?: string | null;
}

export const COLLECTIONS = [
  'products',
  'categories',
  'models',
  'colors',
  'suppliers',
  'connectors',
  'chargingProtocols',
  'materials',
  'notifications',
  'kitComponents',
  'productMedia',
  'mediaFiles',
  'mediaLinks',
  'marketplaceListings',
  'skuListings',
] as const;
export type CollectionName = (typeof COLLECTIONS)[number];

export function isCollectionName(t: string): t is CollectionName {
  return (COLLECTIONS as readonly string[]).includes(t);
}

export function isDictType(t: string): t is DictType {
  return (DICT_TYPES as readonly string[]).includes(t);
}
