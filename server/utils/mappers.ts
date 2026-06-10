// ─── Shared mappers between DB rows and camelCase objects ─────────────────
// DB хранит данные в snake_case + JSONB-обёртке для имени. Файлы и API
// работают с camelCase + name_source/name_product как плоские строки.

import type { RawProduct, DictionaryItem } from '../types';

// ─── Products ────────────────────────────────────────────────────────────

/**
 * Преобразует строку из БД (snake_case + лишние created_at/updated_at)
 * в канонический camelCase-объект, который отдаём клиенту.
 */
// Numeric columns: must be JS numbers, not pg's DECIMAL-as-string.
// Everything else (ids, codes, slugs, free text) stays a string.
const NUMERIC_PRODUCT_COLUMNS = new Set([
  'current_a',
  'voltage_v',
  'power_w',
  'length_m',
  'data_transfer_mbps',
  'device_count',
]);

export function mapProductRow(row: any): RawProduct {
  if (!row) return row;
  const m: any = { id: row.id, sku: row.sku };
  for (const key of Object.keys(row)) {
    if (key === 'id' || key === 'sku' || key === 'created_at' || key === 'updated_at') continue;
    const camel = key.replace(/_([a-z])/g, (_, l: string) => l.toUpperCase());
    let value = row[key];
    if (NUMERIC_PRODUCT_COLUMNS.has(key) && value !== null && value !== '') {
      const n = typeof value === 'number' ? value : Number(value);
      value = Number.isFinite(n) ? n : null;
    }
    m[camel] = value;
  }
  return m as RawProduct;
}

/**
 * Превращает camelCase-объект в массив значений для INSERT/UPDATE.
 * Порядок полей фиксирован — он должен совпадать с SQL-плейсхолдерами.
 */
export function productToDbParams(p: Partial<RawProduct> & { id: string; sku: string }): any[] {
  return [
    p.id,
    p.sku,
    p.skuBase ?? null,
    p.categoryId ?? null,
    p.modelId ?? null,
    p.colorId ?? null,
    p.supplierId ?? null,
    p.bodyMaterialId ?? null,
    p.wireMaterialId ?? null,
    p.currentA ?? null,
    p.voltageV ?? null,
    p.powerW ?? null,
    p.lengthM ?? null,
    p.dataTransferMbps ?? null,
    p.deviceCount ?? null,
    p.connectorFemaleId ?? null,
    p.connectorMaleId ?? null,
    p.variantCode ?? null,
    p.lengthVariant ?? null,
    p.supplierSuffix ?? null,
    p.productName ?? null,
    p.isKit ?? false,
    p.connectionType ?? null,
    p.chargingProtocolId ?? null,
    p.isActive ?? true,
  ];
}

export const PRODUCT_DB_COLUMNS = `
  (id, sku, sku_base, category_id, model_id, color_id, supplier_id,
   body_material_id, wire_material_id, current_a, voltage_v, power_w, length_m,
   data_transfer_mbps, device_count, connector_female_id, connector_male_id,
   variant_code, length_variant, supplier_suffix, product_name, is_kit,
   connection_type, charging_protocol_id, is_active)
`;

export function productInsertSql(): string {
  return `INSERT INTO products ${PRODUCT_DB_COLUMNS} VALUES
    ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
    ON CONFLICT (id) DO UPDATE SET
      sku = EXCLUDED.sku,
      sku_base = EXCLUDED.sku_base,
      category_id = EXCLUDED.category_id,
      model_id = EXCLUDED.model_id,
      color_id = EXCLUDED.color_id,
      supplier_id = EXCLUDED.supplier_id,
      body_material_id = EXCLUDED.body_material_id,
      wire_material_id = EXCLUDED.wire_material_id,
      current_a = EXCLUDED.current_a,
      voltage_v = EXCLUDED.voltage_v,
      power_w = EXCLUDED.power_w,
      length_m = EXCLUDED.length_m,
      data_transfer_mbps = EXCLUDED.data_transfer_mbps,
      device_count = EXCLUDED.device_count,
      connector_female_id = EXCLUDED.connector_female_id,
      connector_male_id = EXCLUDED.connector_male_id,
      variant_code = EXCLUDED.variant_code,
      length_variant = EXCLUDED.length_variant,
      supplier_suffix = EXCLUDED.supplier_suffix,
      product_name = EXCLUDED.product_name,
      is_kit = EXCLUDED.is_kit,
      connection_type = EXCLUDED.connection_type,
      charging_protocol_id = EXCLUDED.charging_protocol_id,
      is_active = EXCLUDED.is_active,
      updated_at = NOW()`;
}

export function productUpdateSql(): string {
  return `UPDATE products SET
      sku = $2,
      sku_base = $3,
      category_id = $4,
      model_id = $5,
      color_id = $6,
      supplier_id = $7,
      body_material_id = $8,
      wire_material_id = $9,
      current_a = $10,
      voltage_v = $11,
      power_w = $12,
      length_m = $13,
      data_transfer_mbps = $14,
      device_count = $15,
      connector_female_id = $16,
      connector_male_id = $17,
      variant_code = $18,
      length_variant = $19,
      supplier_suffix = $20,
      product_name = $21,
      is_kit = $22,
      connection_type = $23,
      charging_protocol_id = $24,
      is_active = $25,
      updated_at = NOW()
    WHERE id = $1`;
}

// ─── Dictionaries ────────────────────────────────────────────────────────

/**
 * Достаёт name_source/name_product из строки БД, где name хранится как JSONB.
 * Если name — обычная строка, дублирует её в оба поля.
 */
export function mapDictionaryRow(row: any): DictionaryItem {
  if (!row) return row;
  const item: DictionaryItem = { id: row.id };
  if (typeof row.name === 'object' && row.name !== null) {
    item.name_source = row.name.source ?? '';
    item.name_product = row.name.product ?? row.name.en ?? row.name.ru ?? '';
  } else {
    const s = String(row.name ?? '');
    item.name_source = s;
    item.name_product = s;
  }
  if (!item.name_source) item.name_source = item.name_product ?? '';
  if (!item.name_product) item.name_product = item.name_source;
  if (row.parent_id) item.categoryId = row.parent_id;
  if (row.code) item.code = row.code;
  if (row.color) item.color = row.color;
  if (row.icon) item.icon = row.icon;
  if (row.description) item.description = row.description;
  if (row.contact_info) item.contactInfo = row.contact_info;
  if (row.short_name) item.shortName = row.short_name;
  if (row.sort_order !== undefined) item.sortOrder = row.sort_order;
  return item;
}

/**
 * Собирает JSONB-объект name из camelCase-полей.
 */
export function dictNameToJson(item: DictionaryItem): string {
  const source = item.name_source ?? item.name ?? '';
  const product = item.name_product ?? item.nameRu ?? item.name ?? item.name_source ?? '';
  return JSON.stringify({ source, product });
}

export function dictInsertSql(): string {
  return `INSERT INTO dictionaries (id, type, name, parent_id, code, color, icon, description, contact_info, short_name, sort_order)
    VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      parent_id = EXCLUDED.parent_id,
      code = EXCLUDED.code,
      color = EXCLUDED.color,
      icon = EXCLUDED.icon,
      description = EXCLUDED.description,
      contact_info = EXCLUDED.contact_info,
      short_name = EXCLUDED.short_name,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW()`;
}

/**
 * Строит UPDATE-SQL для словаря. Возвращает null, если нечего обновлять.
 */
export function buildDictUpdateSql(id: string, body: DictionaryItem): { sql: string; vals: any[] } | null {
  const updates: string[] = [];
  const vals: any[] = [];
  let idx = 1;

  if (body.name_source !== undefined || body.name_product !== undefined || body.name !== undefined || body.nameRu !== undefined) {
    const source = body.name_source ?? body.name ?? '';
    const product = body.name_product ?? body.nameRu ?? body.name ?? body.name_source ?? '';
    updates.push(`name = $${idx}::jsonb`);
    vals.push(JSON.stringify({ source, product }));
    idx++;
  }
  if (body.categoryId !== undefined || body.parentId !== undefined) {
    updates.push(`parent_id = $${idx}`);
    vals.push(body.categoryId ?? body.parentId ?? null);
    idx++;
  }
  if (body.code !== undefined) {
    updates.push(`code = $${idx}`);
    vals.push(body.code ?? null);
    idx++;
  }
  if (body.color !== undefined) {
    updates.push(`color = $${idx}`);
    vals.push(body.color ?? null);
    idx++;
  }
  if (body.icon !== undefined) {
    updates.push(`icon = $${idx}`);
    vals.push(body.icon ?? null);
    idx++;
  }
  if (body.description !== undefined) {
    updates.push(`description = $${idx}`);
    vals.push(body.description ?? null);
    idx++;
  }
  if (body.contactInfo !== undefined) {
    updates.push(`contact_info = $${idx}`);
    vals.push(body.contactInfo ?? null);
    idx++;
  }
  if (body.shortName !== undefined) {
    updates.push(`short_name = $${idx}::jsonb`);
    vals.push(body.shortName ? JSON.stringify(body.shortName) : null);
    idx++;
  }
  if (body.sortOrder !== undefined) {
    updates.push(`sort_order = $${idx}`);
    vals.push(body.sortOrder ?? 0);
    idx++;
  }

  if (updates.length === 0) return null;
  updates.push(`updated_at = NOW()`);
  vals.push(id);
  return {
    sql: `UPDATE dictionaries SET ${updates.join(', ')} WHERE id = $${idx}`,
    vals,
  };
}

/**
 * Санитизация входящего словарного объекта: выкидывает поля, которые нельзя
 * трогать снаружи, нормализует служебные.
 */
export function sanitizeDictItem(item: DictionaryItem): DictionaryItem {
  const out: DictionaryItem = { id: item.id };
  for (const [k, v] of Object.entries(item)) {
    if (k === 'id') continue;
    if (v === undefined) continue;
    (out as any)[k] = v;
  }
  return out;
}

// ─── Kit Components ──────────────────────────────────────────────────────

export function mapKitComponentRow(row: any): import('../types').RawKitComponent {
  if (!row) return row;
  return {
    kitId: row.kit_id,
    componentId: row.component_id,
    quantity: Number(row.quantity ?? 1),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

export function kitComponentToDbParams(k: import('../types').RawKitComponent): any[] {
  return [
    k.kitId,
    k.componentId,
    k.quantity ?? 1,
    k.sortOrder ?? 0,
  ];
}

export function kitComponentInsertSql(): string {
  return `INSERT INTO kit_components (kit_id, component_id, quantity, sort_order)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (kit_id, component_id) DO UPDATE SET
      quantity = EXCLUDED.quantity,
      sort_order = EXCLUDED.sort_order,
      created_at = NOW()`;
}

export function kitComponentDeleteSql(): string {
  return `DELETE FROM kit_components WHERE kit_id = $1 AND component_id = $2`;
}
