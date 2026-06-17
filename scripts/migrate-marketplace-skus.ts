// Миграция marketplace-артикулов из CSV в новый формат:
// marketplaceSkus хранятся прямо на продукте.
//
// Формат CSV (колонки разделены запятой, внутри ячеек — ;):
//   Составляющие, Название, SKU с МП
//
// Пример строки:
//   S19016/01;S10005/01,Комплект. АЗУ...,WB:КАА:161927978;OZON:КАА:...
//
// Запуск:
//   npx tsx scripts/migrate-marketplace-skus.ts "Сбор SKU.csv"

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import type { RawProduct, MarketplaceSku, Marketplace, MarketplaceEntityCode, MarketplaceListingKind } from '../server/types';

const CSV_PATH = process.argv[2];
const PRODUCTS_PATH = resolve(process.cwd(), 'server/data/.defaults/products.json');
const PRODUCTS_LIVE_PATH = resolve(process.cwd(), 'server/data/products.json');

const ENTITY_MAP: Record<string, MarketplaceEntityCode> = {
  КЮА: 'kua',
  КАА: 'kaa',
  ДЕВ: 'dev',
  БМС: 'bms',
};

const MARKETPLACE_MAP: Record<string, Marketplace> = {
  WB: 'wb',
  OZON: 'ozon',
};

interface ParseResult {
  components: string[];
  title: string;
  skus: MarketplaceSku[];
  errors: string[];
}

function normalizeSku(sku: string): string {
  return sku.trim().toUpperCase();
}

function parseMarketplaceEntries(
  raw: string,
  title: string
): { entries: Omit<MarketplaceSku, 'kind'>[]; errors: string[] } {
  const entries: Omit<MarketplaceSku, 'kind'>[] = [];
  const errors: string[] = [];
  if (!raw || !raw.trim()) return { entries, errors };

  const parts = raw.split(';').map((p) => p.trim()).filter(Boolean);
  let currentMarketplace: Marketplace | null = null;

  for (const part of parts) {
    const segments = part.split(':').map((s) => s.trim());
    if (segments.length === 3) {
      const mpRaw = segments[0].toUpperCase();
      const entityRaw = segments[1].toUpperCase();
      const article = segments[2];
      const marketplace = MARKETPLACE_MAP[mpRaw];
      const entity = ENTITY_MAP[entityRaw];
      if (!marketplace) {
        errors.push(`Неизвестный маркетплейс "${mpRaw}"`);
        continue;
      }
      if (!entity) {
        errors.push(`Неизвестное ИП "${entityRaw}"`);
        continue;
      }
      currentMarketplace = marketplace;
      entries.push({ marketplace, entity, article, title });
    } else if (segments.length === 2 && currentMarketplace) {
      const entityRaw = segments[0].toUpperCase();
      const article = segments[1];
      const entity = ENTITY_MAP[entityRaw];
      if (!entity) {
        errors.push(`Неизвестное ИП "${entityRaw}"`);
        continue;
      }
      entries.push({ marketplace: currentMarketplace, entity, article, title });
    } else {
      errors.push(`Неверный формат записи "${part}"`);
    }
  }

  return { entries, errors };
}

function parseLine(line: string, index: number): ParseResult {
  const result: ParseResult = { components: [], title: '', skus: [], errors: [] };
  if (!line.trim()) return result;

  // Разбираем CSV вручную: учитываем, что внутри ячеек нет запятых,
  // поэтому простой split по ',' корректен.
  const cells = line.split(',').map((c) => c.trim());
  if (cells.length < 3) {
    result.errors.push(`Строка ${index + 1}: ожидалось 3 колонки, получено ${cells.length}`);
    return result;
  }

  const componentsRaw = cells[0];
  const title = cells[1];
  const mpRaw = cells[2];

  result.components = componentsRaw
    .split(';')
    .map(normalizeSku)
    .filter(Boolean);
  result.title = title;

  const kind: MarketplaceListingKind = result.components.length > 1 ? 'bundle' : 'single';
  const { entries, errors } = parseMarketplaceEntries(mpRaw, title);
  result.errors = errors;
  result.skus = entries.map((e) => ({ ...e, kind }));

  return result;
}

function dedupeSkus(skus: MarketplaceSku[]): { skus: MarketplaceSku[]; dupes: number } {
  const seen = new Set<string>();
  const out: MarketplaceSku[] = [];
  let dupes = 0;
  for (const s of skus) {
    const key = `${s.marketplace}:${s.entity}:${s.article}:${s.kind}`;
    if (seen.has(key)) {
      dupes++;
      continue;
    }
    seen.add(key);
    out.push(s);
  }
  return { skus: out, dupes };
}

function main() {
  if (!CSV_PATH) {
    console.error('Укажите путь к CSV: npx tsx scripts/migrate-marketplace-skus.ts "Сбор SKU.csv"');
    process.exit(1);
  }

  console.log(`Читаю CSV: ${CSV_PATH}`);
  const csvText = readFileSync(CSV_PATH, 'utf-8');
  const lines = csvText.split(/\r?\n/);

  // Первая строка — заголовки
  const dataLines = lines.slice(1).filter((l) => l.trim());

  const products = readFileSync(PRODUCTS_PATH, 'utf-8');
  const productList: RawProduct[] = JSON.parse(products);
  const productBySku = new Map<string, RawProduct>();
  for (const p of productList) {
    if (p.sku) productBySku.set(p.sku.toUpperCase(), p);
  }

  let appliedProducts = 0;
  let totalSkus = 0;
  let missingProducts = 0;
  let duplicateCount = 0;
  const warnings: string[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const parsed = parseLine(dataLines[i], i + 1);
    if (parsed.errors.length > 0) {
      warnings.push(...parsed.errors.map((e) => `Строка ${i + 2}: ${e}`));
    }
    if (parsed.components.length === 0 || parsed.skus.length === 0) continue;

    const kind: MarketplaceListingKind = parsed.components.length > 1 ? 'bundle' : 'single';

    for (const component of new Set(parsed.components)) {
      const product = productBySku.get(component);
      if (!product) {
        missingProducts++;
        warnings.push(`Не найден продукт "${component}" (строка ${i + 2})`);
        continue;
      }

      if (!product.marketplaceSkus) product.marketplaceSkus = [];

      for (const entry of parsed.skus) {
        product.marketplaceSkus.push({ ...entry, kind });
        totalSkus++;
      }
    }
  }

  // Дедупликация внутри каждого продукта
  for (const p of productList) {
    if (!p.marketplaceSkus || p.marketplaceSkus.length === 0) continue;
    const { skus, dupes } = dedupeSkus(p.marketplaceSkus);
    p.marketplaceSkus = skus;
    if (dupes > 0) {
      duplicateCount += dupes;
      warnings.push(`Продукт ${p.sku}: удалено ${dupes} дубликатов marketplaceSku`);
    }
    appliedProducts++;
  }

  writeFileSync(PRODUCTS_PATH, JSON.stringify(productList, null, 2), 'utf-8');
  writeFileSync(PRODUCTS_LIVE_PATH, JSON.stringify(productList, null, 2), 'utf-8');

  console.log('\n=== Результат миграции ===');
  console.log(`Строк в CSV:        ${dataLines.length}`);
  console.log(`Продуктов обновлено: ${appliedProducts}`);
  console.log(`SKU записей всего:   ${totalSkus}`);
  console.log(`Не найдено SKU:      ${missingProducts}`);
  console.log(`Дубликатов удалено:  ${duplicateCount}`);

  if (warnings.length > 0) {
    console.log(`\n=== Предупреждения (${warnings.length}) ===`);
    for (const w of warnings.slice(0, 50)) {
      console.log(`  - ${w}`);
    }
    if (warnings.length > 50) {
      console.log(`  ... и ещё ${warnings.length - 50} предупреждений`);
    }
  }

  console.log(`\nОбновлены файлы:`);
  console.log(`  ${PRODUCTS_PATH}`);
  console.log(`  ${PRODUCTS_LIVE_PATH}`);
}

main();
