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
  AppNotification,
  Category,
  Color,
  Connector,
  ChargingProtocol,
  Material,
  Model,
  Supplier,
  ProductWithRelations,
  ProductMedia,
  MediaFile,
  MediaLink,
  CategoryAttribute,
  NamingTemplate,
  RawProduct,
  User,
  UserRole,
  MarketplaceSku,
} from '@app-types';

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
  color?: string | null;
  shortName?: unknown;
  sortOrder?: number;
  icon?: string | null;
  description?: string | null;
  contactInfo?: string | null;
  [key: string]: unknown;
};

// ─── Метаданные для загрузки медиафайла ─────────────────────────────────
export interface UploadMediaMeta {
  variantIds: string[];
  isPrimary?: boolean;
}

export interface UploadMediaResult {
  file: MediaFile;
  links: MediaLink[];
  localPreviewUrl: string;
}

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

  /** Получить компоненты комплекта. */
  getKitComponents(kitId: string): Promise<ProductWithRelations[]>;

  /** Добавить компонент в комплект. */
  addKitComponent(kitId: string, componentId: string, quantity?: number): Promise<void>;

  /** Удалить компонент из комплекта. */
  removeKitComponent(kitId: string, componentId: string): Promise<void>;

  // ─── Media ─────────────────────────────────────────────────────────────

  /** Все медиафайлы (для Media Manager). */
  getAllMedia(): (MediaFile & { linkedSkus: string[] })[];

  /** Медиафайлы одного варианта (сгруппированные по файлам). */
  getMediaForVariant(variantId: string): MediaFile[];

  /** Все связи медиафайлов. */
  getAllMediaLinks(): MediaLink[];

  /**
   * Загрузить файл на бэкенд. Возвращает созданный файл и связи
   * + временный blob-URL для мгновенного превью в UI.
   */
  uploadMedia(file: File, meta: UploadMediaMeta): Promise<UploadMediaResult>;

  /** Удалить медиафайл (метаданные + физический файл на бэке) + все связи. */
  deleteMedia(fileId: string): Promise<void>;

  /** Удалить все медиафайлы и их связи. */
  deleteAllMedia(): Promise<void>;

  /** Удалить только связь файла с вариантом. */
  deleteMediaLink(fileId: string, variantId: string): Promise<void>;

  /** Сделать файл primary для конкретного варианта. */
  setMediaPrimary(fileId: string, variantId: string): Promise<MediaLink>;
}

// ─── Notifications API ─────────────────────────────────────────────────────
export interface NotificationsAPI {
  /** Все уведомления, от новых к старым. */
  readonly list: AppNotification[];
  /** Количество непрочитанных. */
  readonly unreadCount: number;
  /** Добавить новое уведомление (сервер сам проставит id, createdAt). */
  add(n: Omit<AppNotification, 'id' | 'createdAt' | 'unread'>): Promise<void>;
  /** Отметить одно как прочитанное. */
  markRead(id: string): Promise<void>;
  /** Отметить все как прочитанные. */
  markAllRead(): Promise<void>;
  /** Удалить уведомление (без подтверждения). */
  remove(id: string): Promise<void>;
  /** Удалить все уведомления. */
  clear(): Promise<void>;
}

// ─── Settings API ─────────────────────────────────────────────────────────
export interface SettingsAPI {
  /** Полный сброс к дефолтным значениям (на бэке). */
  reset(): Promise<void>;

  /** Сид (merge) данных из defaults в БД без удаления существующих записей. */
  seed(): Promise<void>;

  /** Скачать JSON-бандл со всеми данными. Возвращает строку-имя для файла. */
  exportToFile(): Promise<string>;

  /** Импортировать JSON-бандл. Принимает текст файла. */
  importFromFile(text: string): Promise<void>;
}

// ─── Users API (только admin в dev-режиме) ────────────────────────────────
export interface UsersAPI {
  /** Все пользователи системы. */
  readonly list: User[];

  /** Создать пользователя. */
  create(data: {
    displayName: string;
    login: string;
    password: string;
    role?: UserRole;
  }): Promise<User>;

  /** Обновить пользователя. */
  update(
    id: string,
    patch: Partial<{
      displayName: string;
      login: string;
      password: string;
      role: UserRole;
      isActive: boolean;
    }>
  ): Promise<User>;

  /** Удалить пользователя. */
  remove(id: string): Promise<void>;
}

// ─── Inspector API (только dev-режим) ─────────────────────────────────────
export interface InspectorColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
}

export interface InspectorTableInfo {
  name: string;
  rowEstimate: number;
  totalBytes: number;
  totalSize: string;
  columns: InspectorColumnInfo[];
}

export interface InspectorQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

export interface InspectorAPI {
  /** Доступен ли инспектор (только dev-режим + БД). */
  readonly available: boolean;

  /** Список всех таблиц схемы public с метаданными. */
  listTables(): Promise<InspectorTableInfo[]>;

  /** Полный дамп таблицы (LIMIT 5000). Использует `SELECT *`. */
  dumpTable(table: string): Promise<InspectorQueryResult>;

  /** Выполнить произвольный read-only SQL. */
  runQuery(sql: string): Promise<InspectorQueryResult>;
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
  readonly notifications: NotificationsAPI;
  readonly settings: SettingsAPI;
  readonly users: UsersAPI;
  readonly inspector: InspectorAPI;

  /** Перезагрузить все данные с бэка. */
  refresh(): Promise<void>;

  /** Подписка на изменения (вызывается после каждой мутации). */
  subscribe(listener: (topic?: string) => void): () => void;

  /** Уведомить подписчиков. `topic` позволяет селективную подписку. */
  notify(topic?: string): void;

  /**
   * Приостановить уведомления подписчиков. После endBatch() будет
   * ровно один notify('all'), сколько бы мутаций ни произошло внутри.
   * Используется для групповых операций (batch delete, массовая загрузка),
   * чтобы избежать N ре-рендеров подряд.
   */
  beginBatch(): void;
  endBatch(): void;
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
  },
  mediaFiles: MediaFile[] = [],
  mediaLinks: MediaLink[] = [],
  marketplaceSkus: MarketplaceSku[] = []
): ProductWithRelations {
  const category =
    dicts.categories.find((c) => c.id === raw.categoryId) ?? { ...FALLBACK_CATEGORY };
  const model = raw.modelId
    ? (dicts.models.find((m) => m.id === raw.modelId) ?? { ...FALLBACK_MODEL })
    : { id: '', categoryId: '', code: '', name_source: '', name_product: '', description: '' };
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

  const myLinks = mediaLinks
    .filter((l) => l.variantId === raw.id)
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });

  const myMedia: ProductMedia[] = myLinks.map((l) => {
    const file = mediaFiles.find((f) => f.id === l.fileId);
    return {
      id: l.fileId,
      variantId: l.variantId,
      mediaType: file?.mimeType?.startsWith('video/') ? 'video' : 'image',
      url: file?.url ?? '',
      fileName: file?.originalName ?? '',
      mimeType: file?.mimeType,
      sizeBytes: file?.sizeBytes,
      isPrimary: l.isPrimary,
      sortOrder: l.sortOrder,
      uploadedAt: l.uploadedAt,
    };
  });

  const myFiles = mediaFiles.filter((f) => myLinks.some((l) => l.fileId === f.id));

  return {
    id: raw.id ?? '',
    sku: raw.sku,
    skuBase: raw.skuBase ?? '',
    category,
    model,
    color,
    supplier,
    productName: buildName() || (raw.productName ?? ''),
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
    media: myMedia,
    mediaFiles: myFiles,
    mediaLinks: myLinks,
    marketplaceSkus: marketplaceSkus,
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
    color: String(item.color ?? ''),
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
    color: String(item.color ?? '#000000'),
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
