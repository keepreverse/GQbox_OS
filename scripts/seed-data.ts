import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '../server/data');
const defaultsDir = resolve(dataDir, '.defaults');

async function seed() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(defaultsDir)) mkdirSync(defaultsDir, { recursive: true });

  const { _defaultRawProducts } = await import('../src/data/products');
  const {
    _defaultCategories, _defaultModels, _defaultColors,
    _defaultSuppliers, _defaultConnectors,
    _defaultChargingProtocols, _defaultMaterials
  } = await import('../src/data/dictionaries');

  const files: [string, unknown[]][] = [
    ['products', _defaultRawProducts],
    ['categories', _defaultCategories],
    ['models', _defaultModels],
    ['colors', _defaultColors],
    ['suppliers', _defaultSuppliers],
    ['connectors', _defaultConnectors],
    ['chargingProtocols', _defaultChargingProtocols],
    ['materials', _defaultMaterials],
  ];

  for (const [name, data] of files) {
    writeFileSync(resolve(dataDir, `${name}.json`), JSON.stringify(data, null, 2), 'utf-8');
    writeFileSync(resolve(defaultsDir, `${name}.json`), JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✓ server/data/${name}.json (${data.length} records)`);
  }
}

seed().catch(console.error);
