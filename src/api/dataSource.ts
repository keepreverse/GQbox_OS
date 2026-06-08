// ─── DataSource interface + гидрация ──────────────────────────────────────
// DataSource — это абстракция над «где живут данные». У нас две реализации:
// demoDataSource (JSON-файлы) и devDataSource (PostgreSQL). Обе отдают
// одинаковый API, так что фичи не знают, откуда данные.
//
// Жизненный цикл:
// 1. На mount приложения: refresh() дёргает /products и /dictionaries/*,
//    заполняет in-memory кэш и гидрирует продукты (добавляет category,
//    model, color и т.д.).
// 2. Фичи читают из кэша синхронно (как раньше импортировали products[]).
// 3. Мутации (create/update/delete) → API → локально патчим кэш → notify.
// 4. Смена mode → полный reset + refresh().

import type {
  Category,
  Color,
  Connector,
  ChargingProtocol,
  Material,
  Model,
  Supplier,
  ProductWithRelations,
  CategoryAttribute,
  NamingTemplate,
  RawProduct,
} from '@app-types';
import { getMarketplaceListingsBySku } from '../data/marketplaces';

// ─── Тип для сырого словарного элемента, как приходит с бэка ──────────────
export type RawDictItem = {
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
};

// ─── Словарные API ────────────────────────────────────────────────────────
export interface DictionariesAPI {
  readonly categories: Category[];
  readonly models: Model[];
  readonly colors: Color[];
  readonly suppliers: Supplier[];
  readonly connectors: Connector[];
  readonly chargingProtocols: ChargingProtocol[];
  readonly materials: Material[];
  readonly attributes: CategoryAttribute[];
  readonly namingTemplates: NamingTemplate[];

  /** Универсальный поиск: byId('categories', 'cat-cable'). */
  byId(type: string, id: string): RawDictItem | undefined;

  /** Все записи конкретного типа. */
  getAll(type: string): RawDictItem[];

  /** Добавить новую запись. */
  add(type: string, item: RawDictItem): Promise<void>;

  /** Обновить существующую. */
  update(type: string, id: string, patch: Partial<RawDictItem>): Promise<void>;

  /** Удалить запись. */
  remove(type: string, id: string): Promise<void>;
}

// ─── Products API ─────────────────────────────────────────────────────────
export interface ProductsAPI {
  /** Гидрированные продукты с развёрнутыми relations. */
  readonly list: ProductWithRelations[];

  /** Найти по id. */
  byId(id: string): ProductWithRelations | undefined;

  /** Найти по SKU. */
  bySku(sku: string): ProductWithRelations | undefined;

  /** Все товары конкретной категории по её `code` (например 'cable'). */
  byCategory(categoryCode: string): ProductWithRelations[];

  /** Полнотекстовый поиск. */
  search(query: string): ProductWithRelations[];

  /** Создать новый товар. */
  create(raw: RawProduct): Promise<ProductWithRelations>;

  /** Обновить существующий. */
  update(id: string, patch: Partial<RawProduct>): Promise<ProductWithRelations>;

  /** Удалить. */
  remove(id: string): Promise<void>;
}

// ─── Settings API ─────────────────────────────────────────────────────────
export interface SettingsAPI {
  /** Полный сброс к дефолтным значениям (на бэке). */
  reset(): Promise<void>;

  /** Скачать JSON-бандл со всеми данными. Возвращает строку-имя для файла. */
  exportToFile(): Promise<string>;

  /** Импортировать JSON-бандл. Принимает текст файла. */
  importFromFile(text: string): Promise<void>;
}

// ─── Главный контракт ─────────────────────────────────────────────────────
export interface DataSource {
  /** 'demo' | 'dev' — какой режим активен. */
  readonly mode: 'demo' | 'dev';

  /** Загружены ли данные. Фичи рендерят лоадер, пока false. */
  readonly isReady: boolean;

  /** Текст последней ошибки (или null). */
  readonly error: string | null;

  readonly products: ProductsAPI;
  readonly dictionaries: DictionariesAPI;
  readonly settings: SettingsAPI;

  /** Перезагрузить все данные с бэка. */
  refresh(): Promise<void>;

  /** Подписка на изменения (вызывается после каждой мутации). */
  subscribe(listener: () => void): () => void;
}

// ─── Гидрация: сырой продукт + справочники → ProductWithRelations ────────

const FALLBACK_CATEGORY: Category = {
  id: '',
  code: 'unknown',
  name_source: 'Unknown',
  name_product: 'Неизвестно',
  color: '',
  icon: '',
  description: '',
  sortOrder: 0,
};

const FALLBACK_MODEL: Model = {
  id: '',
  categoryId: '',
  code: 'unknown',
  name_source: 'Unknown',
  name_product: 'Неизвестно',
};

function generateSeedCreatedAt(index: number, total: number): string {
  const denom = Math.max(total - 1, 1);
  const daysAgo = Math.floor((total - 1 - index) * (180 / denom));
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Превращает сырой продукт + карту справочников в `ProductWithRelations`.
 * Генерирует `productName`, `description`, `usp`, `tags` (как раньше делал
 * `src/data/products.ts:hydrate`).
 */
export function hydrateProduct(
  raw: RawProduct,
  index: number,
  total: number,
  dicts: {
    categories: Category[];
    models: Model[];
    colors: Color[];
    suppliers: Supplier[];
    connectors: Connector[];
    materials: Material[];
    chargingProtocols: ChargingProtocol[];
  }
): ProductWithRelations {
  const category =
    dicts.categories.find((c) => c.id === raw.categoryId) ?? { ...FALLBACK_CATEGORY };
  const model =
    dicts.models.find((m) => m.id === raw.modelId) ?? { ...FALLBACK_MODEL };
  const color = raw.colorId ? dicts.colors.find((c) => c.id === raw.colorId) : undefined;
  const supplier = raw.supplierId
    ? dicts.suppliers.find((s) => s.id === raw.supplierId)
    : undefined;
  const bodyMaterial = raw.bodyMaterialId
    ? dicts.materials.find((m) => m.id === raw.bodyMaterialId)
    : undefined;
  const wireMaterial = raw.wireMaterialId
    ? dicts.materials.find((m) => m.id === raw.wireMaterialId)
    : undefined;
  const connectorFemale = raw.connectorFemaleId
    ? dicts.connectors.find((c) => c.id === raw.connectorFemaleId)
    : undefined;
  const connectorMale = raw.connectorMaleId
    ? dicts.connectors.find((c) => c.id === raw.connectorMaleId)
    : undefined;
  const chargingProtocol = raw.chargingProtocolId
    ? dicts.chargingProtocols.find((p) => p.id === raw.chargingProtocolId)
    : undefined;

  const buildName = (): string => {
    const parts: string[] = [];
    parts.push(category.name_product + '.');
    if (connectorFemale && connectorMale) {
      parts.push(`${connectorFemale.name_product}-${connectorMale.name_product}`);
    } else if (connectorFemale) {
      parts.push(connectorFemale.name_product);
    } else if (connectorMale) {
      parts.push(connectorMale.name_product);
    }
    if (model && model.name_product) parts.push(model.name_product);
    if (typeof raw.powerW === 'number') parts.push(`${raw.powerW}W`);
    if (typeof raw.lengthM === 'number') parts.push(`${raw.lengthM}м`);
    if (color) parts.push(color.name_product);
    return parts.join(' ');
  };

  const generateDescription = (): string => {
    const cat = category.name_product;
    const modelSrc = model.name_product;
    const power = raw.powerW ? `${raw.powerW}W` : '';
    const length = raw.lengthM ? `${raw.lengthM}м` : '';
    return `${cat} серии ${modelSrc}${power ? ` мощностью ${power}` : ''}${
      length ? ` длиной ${length}` : ''
    }. Предназначен для быстрой и безопасной зарядки устройств.`;
  };

  const generateUsp = (): string => {
    const features: string[] = [];
    if (raw.powerW && raw.powerW >= 20) features.push('Быстрая зарядка');
    if (chargingProtocol) features.push(chargingProtocol.name_product);
    if (raw.dataTransferMbps) features.push('Передача данных');
    if (bodyMaterial && bodyMaterial.name_source === 'aluminum') features.push('Алюминиевый корпус');
    return features.join(' • ');
  };

  const generateTags = (): string[] => {
    const tags: string[] = [];
    tags.push(category.code);
    tags.push(model.code);
    if (raw.powerW) tags.push(`${raw.powerW}W`);
    if (color) tags.push(color.code);
    if (chargingProtocol) tags.push(chargingProtocol.code);
    return tags;
  };

  return {
    id: raw.id ?? '',
    sku: raw.sku,
    skuBase: raw.skuBase ?? '',
    category,
    model,
    color,
    supplier,
    productName: buildName(),
    bodyMaterial,
    wireMaterial,
    currentA: raw.currentA,
    voltageV: raw.voltageV,
    powerW: raw.powerW,
    lengthM: raw.lengthM,
    dataTransferMbps: raw.dataTransferMbps,
    deviceCount: raw.deviceCount,
    connectorFemale,
    connectorMale,
    chargingProtocol,
    connectionType: raw.connectionType,
    isKit: raw.isKit ?? false,
    isActive: raw.isActive ?? true,
    variantCode: raw.variantCode,
    lengthVariant: raw.lengthVariant,
    supplierSuffix: raw.supplierSuffix,
    createdAt: raw.createdAt ?? generateSeedCreatedAt(index, total),
    description: generateDescription(),
    usp: generateUsp(),
    tags: generateTags(),
    media: [],
    marketplaceListings: getMarketplaceListingsBySku(raw.sku),
  };
}

/**
 * Безопасно кастит сырой dict-объект к одному из типизированных справочников.
 * Используется DataSource'ами для отдачи типизированных массивов в UI.
 */
export function asCategory(item: RawDictItem): Category {
  return {
    id: item.id,
    code: String(item.code ?? ''),
    name_source: String(item.name_source ?? item.name ?? ''),
    name_product: String(item.name_product ?? item.nameRu ?? item.name ?? item.name_source ?? ''),
    color: String(item.color ?? item.hex ?? item.hexValue ?? ''),
    icon: String(item.icon ?? ''),
    description: String(item.description ?? ''),
    sortOrder: Number(item.sortOrder ?? 0),
  };
}

export function asModel(item: RawDictItem): Model {
  return {
    id: item.id,
    categoryId: String(item.categoryId ?? item.parentId ?? ''),
    code: String(item.code ?? ''),
    name_source: String(item.name_source ?? item.name ?? ''),
    name_product: String(item.name_product ?? item.nameRu ?? item.name ?? item.name_source ?? ''),
    description: String(item.description ?? ''),
  };
}

export function asColor(item: RawDictItem): Color {
  return {
    id: item.id,
    code: String(item.code ?? ''),
    name_source: String(item.name_source ?? item.name ?? ''),
    name_product: String(item.name_product ?? item.nameRu ?? item.name ?? item.name_source ?? ''),
    hexValue: String(item.hex ?? item.hexValue ?? '#000000'),
  };
}

export function asSupplier(item: RawDictItem): Supplier {
  return {
    id: item.id,
    code: String(item.code ?? ''),
    name: String(item.name ?? item.name_product ?? item.name_source ?? ''),
    contactInfo: String(item.contactInfo ?? ''),
  };
}

export function asConnector(item: RawDictItem): Connector {
  return {
    id: item.id,
    code: String(item.code ?? ''),
    name_source: String(item.name_source ?? item.name ?? ''),
    name_product: String(item.name_product ?? item.nameRu ?? item.name ?? item.name_source ?? ''),
  };
}

export function asChargingProtocol(item: RawDictItem): ChargingProtocol {
  return {
    id: item.id,
    code: String(item.code ?? ''),
    name_source: String(item.name_source ?? item.name ?? ''),
    name_product: String(item.name_product ?? item.nameRu ?? item.name ?? item.name_source ?? ''),
    description: String(item.description ?? ''),
  };
}

export function asMaterial(item: RawDictItem): Material {
  return {
    id: item.id,
    code: String(item.code ?? ''),
    name_source: String(item.name_source ?? item.name ?? ''),
    name_product: String(item.name_product ?? item.nameRu ?? item.name ?? item.name_source ?? ''),
  };
}

export const DICT_TYPE_NAMES = [
  'categories',
  'models',
  'colors',
  'suppliers',
  'connectors',
  'chargingProtocols',
  'materials',
] as const;

export type DictTypeName = (typeof DICT_TYPE_NAMES)[number];
