/**
 * Семантика полей для всех словарных объектов:
 *  - name     : ИСТОЧНИК  (левый столбец словаря, код для артикула)
 *  - nameRu   : ТОВАРНОЕ RU  (правый столбец словаря, как есть, на русском)
 *  - nameEn?  : ТОВАРНОЕ EN  (перевод правого столбца на английский;
 *                              если не указано — будет использовано nameRu как fallback)
 */

export interface Category {
  id: string;
  code: string;
  name: string;      // источник: АЗУ, БЗУ, Кабель...
  sourceEn?: string; // источник EN: Car Charger, Cable...
  nameRu: string;    // товарное RU: АЗУ., БЗУ., Кабель.
  nameEn?: string;   // товарное EN: Car Charger., Wireless Charger., Cable.
  color: string;
  icon: string;
  description: string;
  sortOrder: number;
}

export interface Model {
  id: string;
  categoryId: string;
  code: string;
  name: string;      // источник: braided, Carbon, Butterfly...
  sourceEn?: string; // источник EN
  nameRu: string;    // товарное RU: плетеный, карбоновый, Бабочка
  nameEn?: string;   // товарное EN: braided, Carbon, Butterfly
  description?: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactInfo?: string;
}

export interface Color {
  id: string;
  code: string;
  name: string;
  sourceEn?: string;
  nameRu: string;    // товарное RU: Черный, Белый, Красный
  nameEn?: string;   // товарное EN: Black, White, Red
  hexValue: string;
}

export interface Connector {
  id: string;
  code: string;
  name: string;
  sourceEn?: string;
  nameRu: string;
  nameEn?: string;
}

export interface ChargingProtocol {
  id: string;
  code: string;
  name: string;
  sourceEn?: string;
  nameRu: string;
  nameEn?: string;
  description?: string;
}

export interface Material {
  id: string;
  code: string;
  name: string;
  sourceEn?: string;
  nameRu: string;
  nameEn?: string;
}

export interface ProductBase {
  id: string;
  skuBase: string;
  categoryId: string;
  modelId: string;
  nameTemplate: string;
  nameTemplateRu: string;
  description?: string;
  bodyMaterialId?: string;
  wireMaterialId?: string;
  currentA?: number;
  voltageV?: number;
  powerW?: number;
  lengthM?: number;
  dataTransferMbps?: number;
  deviceCount?: number;
  connectorFemaleId?: string;
  connectorMaleId?: string;
  chargingProtocolId?: string;
  connectionType?: string;
  supplierId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productBaseId: string;
  sku: string;
  variantCode?: string;
  colorId?: string;
  lengthVariant?: string;
  supplierSuffix?: string;
  isKit: boolean;
  fullName: string;
  fullNameRu: string;
  barcode?: string;
  isActive: boolean;
  createdAt: string;
}

export interface KitComponent {
  id: string;
  kitVariantId: string;
  componentVariantId: string;
  quantity: number;
  sortOrder: number;
}

export interface ProductMedia {
  id: string;
  variantId: string;
  mediaType: 'image' | 'video';
  url: string;
  fileName: string;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface MarketplaceListing {
  marketplace: 'wb' | 'ozon';
  article: string;
  url: string;
  title: string;
  kind: 'single' | 'bundle';
  skus: string[];
}

export interface PackagingItem {
  id: string;
  sku: string;
  name: string;
  nameRu: string;
  category: string;
  materialId?: string;
  dimensions?: string;
  colorId?: string;
  supplierId?: string;
}

export interface CategoryAttribute {
  id: string;
  categoryId: string;
  attributeCode: string;
  attributeName: string;
  attributeNameRu: string;
  dataType: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  isRequired: boolean;
  options?: string[];
  sortOrder: number;
}

export interface NamingTemplate {
  id: string;
  categoryId: string;
  template: string;
  templateRu: string;
  description?: string;
  isDefault: boolean;
}

export interface ProductWithRelations {
  id: string;
  sku: string;
  skuBase: string;
  category: Category;
  model: Model;
  color?: Color;
  supplier?: Supplier;
  fullName: string;
  fullNameRu: string;
  bodyMaterial?: Material;
  wireMaterial?: Material;
  currentA?: number;
  voltageV?: number;
  powerW?: number;
  lengthM?: number;
  dataTransferMbps?: number;
  deviceCount?: number;
  connectorFemale?: Connector;
  connectorMale?: Connector;
  chargingProtocol?: ChargingProtocol;
  connectionType?: string;
  isKit: boolean;
  isActive: boolean;
  variantCode?: string;
  lengthVariant?: string;
  supplierSuffix?: string;
  createdAt: string;
  description?: string;
  descriptionEn?: string;
  usp?: string;
  uspEn?: string;
  tags?: string[];
  media?: ProductMedia[];
  marketplaceListings?: MarketplaceListing[];
}

export interface SKUPattern {
  prefix: string;
  baseNumber: string;
  variant?: string;
  colorCode?: string;
  supplierSuffix?: string;
  kitSuffix?: string;
}

export interface SystemArchitecture {
  entities: EntityDefinition[];
  relationships: RelationshipDefinition[];
  skuLogic: SKULogicDefinition;
  namingLogic: NamingLogicDefinition;
}

export interface EntityDefinition {
  name: string;
  description: string;
  fields: { name: string; type: string; description: string }[];
}

export interface RelationshipDefinition {
  from: string;
  to: string;
  type: string;
  description: string;
}

export interface SKULogicDefinition {
  pattern: string;
  segments: { code: string; description: string; examples: string[] }[];
  rules: string[];
}

export interface NamingLogicDefinition {
  pattern: string;
  segments: { code: string; description: string; examples: string[] }[];
  rules: string[];
}

export type ViewType = 
  | 'dashboard' 
  | 'architecture' 
  | 'matrix' 
  | 'sku-constructor' 
  | 'dictionary' 
  | 'product-detail'
  | 'kit-builder'
  | 'media'
  | 'ai-hub';
