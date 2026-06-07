import type { SystemArchitecture, EntityDefinition, RelationshipDefinition, SKULogicDefinition, NamingLogicDefinition } from '@app-types';

// Английская версия
export const skuLogicEn: SKULogicDefinition = {
  pattern: 'S[XXXXX][-variant][/color][-supplier][-kit]',
  segments: [
    { code: 'S', description: 'Brand prefix — GQbox identifier', examples: ['S'] },
    { code: 'XXXXX', description: '5-digit sequential base number — unique product identifier', examples: ['10002', '19001', '90501'] },
    { code: '-variant', description: 'Model or length variant suffix', examples: ['-E (ZS variant)', '-ST (Standard)', '-PR (Premium)', '-2 (2m length)', '-3 (3m)', '-025 (0.25m)'] },
    { code: '/color', description: 'Color code — 2-digit numeric identifier', examples: ['/01 (Black)', '/02 (White)', '/03 (Red)', '/11 (Purple)'] },
    { code: '-supplier', description: 'Supplier suffix — when same product from different suppliers', examples: ['-A (Angela)', '-W (Wendy)', '-ST (Angela+Wendy dual)'] },
    { code: '-kit', description: 'Kit/Combo indicator — product bundle', examples: ['-K (Kit/Combo)'] },
  ],
  rules: [
    'Base number S10000-S19999 reserved for cables, chargers, and electronic accessories',
    'Base number S90000-S99999 reserved for wireless chargers, holders, and Blogo accessories',
    'Length variants use hyphen + number: -2, -3, -025 (0.25m)',
    'Model variants use hyphen + code: -ST, -PR, -ORG, -E',
    'Color codes are 2-digit: /01, /02, /03, etc.',
    'Supplier suffix appended after color when needed: -A, -W',
    'Kit products append -K after all other segments',
    'Cyrillic К prefix (SК10008) used for special/original products',
  ],
};

// Русская версия
export const skuLogicRu: SKULogicDefinition = {
  pattern: 'S[XXXXX][-variant][/color][-supplier][-kit]',
  segments: [
    { code: 'S', description: 'Префикс бренда — идентификатор GQbox', examples: ['S'] },
    { code: 'XXXXX', description: '5-значный последовательный базовый номер — уникальный идентификатор товара', examples: ['10002', '19001', '90501'] },
    { code: '-variant', description: 'Суффикс модели или длины', examples: ['-E (вариант ZS)', '-ST (Стандарт)', '-PR (Премиум)', '-2 (2м длина)', '-3 (3м)', '-025 (0.25м)'] },
    { code: '/color', description: 'Код цвета — 2-значный цифровой идентификатор', examples: ['/01 (Чёрный)', '/02 (Белый)', '/03 (Красный)', '/11 (Фиолетовый)'] },
    { code: '-supplier', description: 'Суффикс поставщика — при поставке одного товара разными поставщиками', examples: ['-A (Angela)', '-W (Wendy)', '-ST (Angela+Wendy совместно)'] },
    { code: '-kit', description: 'Индикатор комплекта — бандл товаров', examples: ['-K (Комплект)'] },
  ],
  rules: [
    'Базовые номера S10000-S19999 зарезервированы для кабелей, зарядных устройств и электронных аксессуаров',
    'Базовые номера S90000-S99999 зарезервированы для беспроводных зарядок, держателей и аксессуаров Blogo',
    'Варианты длины используют дефис + цифру: -2, -3, -025 (0.25м)',
    'Варианты модели используют дефис + код: -ST, -PR, -ORG, -E',
    'Коды цвета 2-значные: /01, /02, /03 и т.д.',
    'Суффикс поставщика добавляется после цвета при необходимости: -A, -W',
    'Комплекты получают суффикс -K после всех остальных сегментов',
    'Кириллический префикс К (SК10008) используется для специальных/оригинальных товаров',
  ],
};

// Английская версия
export const namingLogicEn: NamingLogicDefinition = {
  pattern: '[Category]. [Connector1]-[Connector2] [Model] [Length] [Color]',
  segments: [
    { code: 'Category', description: 'Product category name in Russian', examples: ['Кабель (Cable)', 'СЗУ (Wall Charger)', 'БЗУ (Wireless Charger)', 'Наушники (Headphones)'] },
    { code: 'Connector1', description: 'Female/input connector abbreviation', examples: ['L (Lightning)', 'TC (Type-C)', 'USB (USB-A)', 'Micro (Micro-USB)', 'Jack (3.5mm)'] },
    { code: 'Connector2', description: 'Male/output connector abbreviation', examples: ['USB (USB-A)', 'TC (Type-C)', 'Jack (3.5mm)', '360 (360° Magnetic)'] },
    { code: 'Model', description: 'Product model/line identifier', examples: ['ZS', 'PR', 'ST', 'ORG', 'Carbon Spiral', 'Braided'] },
    { code: 'Length', description: 'Cable length in meters', examples: ['1м', '2м', '1.5м', '0.25м'] },
    { code: 'Color', description: 'Product color in Russian, uppercase', examples: ['ЧЕРНЫЙ (Black)', 'БЕЛЫЙ (White)', 'КРАСНЫЙ (Red)', 'ФИОЛЕТОВЫЙ (Purple)'] },
  ],
  rules: [
    'Category prefix always uses Russian noun with period: "Кабель.", "СЗУ.", "БЗУ."',
    'Connectors abbreviated: L=Lightning, TC=Type-C, USB=USB-A',
    'Model names in original language (ZS, PR, ST, ORG) or translated (плетеный=Braided)',
    'Length expressed in meters with "м" suffix: 1м, 2м, 1.5м',
    'Color always in Russian, UPPERCASE at end of name',
    'For kits: "Комплект. [Component1] + [Component2]" pattern',
    'For chargers: "СЗУ. [Protocol] [Connector] [Power]W [Color]"',
    'For headphones: "Наушники. [Connector] [Model] [Connection] [Color]"',
  ],
};

// Русская версия
export const namingLogicRu: NamingLogicDefinition = {
  pattern: '[Категория]. [Разъём1]-[Разъём2] [Модель] [Длина] [Цвет]',
  segments: [
    { code: 'Категория', description: 'Название категории товара на русском языке', examples: ['Кабель', 'СЗУ (Настенное зарядное)', 'БЗУ (Беспроводное)', 'Наушники'] },
    { code: 'Разъём1', description: 'Сокращение женского/входного разъёма', examples: ['L (Lightning)', 'TC (Type-C)', 'USB (USB-A)', 'Micro (Micro-USB)', 'Jack (3.5мм)'] },
    { code: 'Разъём2', description: 'Сокращение мужского/выходного разъёма', examples: ['USB (USB-A)', 'TC (Type-C)', 'Jack (3.5мм)', '360 (360° Магнитный)'] },
    { code: 'Модель', description: 'Идентификатор модели/линейки товара', examples: ['ZS', 'PR', 'ST', 'ORG', 'Carbon Spiral', 'Braided (Плетёный)'] },
    { code: 'Длина', description: 'Длина кабеля в метрах', examples: ['1м', '2м', '1.5м', '0.25м'] },
    { code: 'Цвет', description: 'Цвет товара на русском, заглавными буквами', examples: ['ЧЁРНЫЙ', 'БЕЛЫЙ', 'КРАСНЫЙ', 'ФИОЛЕТОВЫЙ'] },
  ],
  rules: [
    'Префикс категории всегда использует русское существительное с точкой: "Кабель.", "СЗУ.", "БЗУ."',
    'Разъёмы сокращаются: L=Lightning, TC=Type-C, USB=USB-A',
    'Названия моделей на оригинальном языке (ZS, PR, ST, ORG) или переведённые (плетёный)',
    'Длина выражается в метрах с суффиксом "м": 1м, 2м, 1.5м',
    'Цвет всегда на русском языке, ЗАГЛАВНЫМИ буквами в конце названия',
    'Для комплектов: "Комплект. [Компонент1] + [Компонент2]"',
    'Для зарядок: "СЗУ. [Протокол] [Разъём] [Мощность]W [Цвет]"',
    'Для наушников: "Наушники. [Разъём] [Модель] [Подключение] [Цвет]"',
  ],
};

// Экспорт в зависимости от языка
export const skuLogic = skuLogicRu;
export const namingLogic = namingLogicRu;

// Английские заметки по архитектуре
export const architectureNotesEn = `
## Deep Architecture Analysis

### 1. SKU Generation Logic
The SKU system follows a hierarchical encoding pattern:

**Pattern:** \`S[BaseNumber][-Variant][/Color][-Supplier][-Kit]\`

- **S**: Fixed brand prefix for GQbox
- **BaseNumber**: 5-digit sequential (S10000-S19999 for cables/chargers, S90000-S99999 for accessories)
- **-Variant**: Model differentiation (-ST, -PR, -ORG, -E) or length (-2, -3, -025)
- **/Color**: 2-digit color code (/01=Black, /02=White, /03=Red, /11=Purple)
- **-Supplier**: Source differentiation (-A=Angela, -W=Wendy)
- **-Kit**: Bundle indicator (-K)

### 2. Naming Logic
Names are auto-generated from structured templates per category:

- **Cables**: \`Cable. [Female]-[Male] [Model] [Length] [Color]\`
- **Chargers**: \`Wall Charger. [Protocol] [Connector] [Power]W [Color]\`
- **Headphones**: \`Headphones. [Connector] [Model] [Connection] [Color]\`
- **Kits**: \`Kit. [Component1] + [Component2]\`

### 3. Entity Relationships
The system uses a 3-level product hierarchy:
1. **Category** → Model → Product Base → Product Variant
2. Each base product spawns variants by color, length, and supplier
3. Kits link multiple variants together

### 4. Database Normalization
- All dictionaries (colors, connectors, protocols, suppliers) are fully normalized
- Product attributes are category-specific via dynamic schema
- SKU generation is deterministic via database functions
- Name generation uses template engine with dictionary lookups

### 5. Scalability Design
- UUID primary keys for global uniqueness
- Composite unique constraints on SKU
- JSONB fields for extensible attributes
- Row Level Security for multi-tenant access
- Full-text search indexes on names and SKUs
`;

// Русские заметки по архитектуре
export const architectureNotesRu = `
## Глубокий анализ архитектуры

### 1. Логика генерации SKU
Система SKU следует иерархическому паттерну кодирования:

**Паттерн:** \`S[БазовыйНомер][-Вариант][/Цвет][-Поставщик][-Комплект]\`

- **S**: Фиксированный префикс бренда для GQbox
- **БазовыйНомер**: 5-значный последовательный (S10000-S19999 для кабелей/зарядных устройств, S90000-S99999 для аксессуаров)
- **-Вариант**: Дифференциация модели (-ST, -PR, -ORG, -E) или длины (-2, -3, -025)
- **/Цвет**: 2-значный код цвета (/01=Чёрный, /02=Белый, /03=Красный, /11=Фиолетовый)
- **-Поставщик**: Дифференциация источника (-A=Angela, -W=Wendy)
- **-Комплект**: Индикатор бандла (-K)

### 2. Логика названий
Названия автоматически генерируются из структурированных шаблонов для каждой категории:

- **Кабели**: \`Кабель. [Мама]-[Папа] [Модель] [Длина] [Цвет]\`
- **СЗУ**: \`СЗУ. [Протокол] [Разъём] [Мощность]W [Цвет]\`
- **Наушники**: \`Наушники. [Разъём] [Модель] [Подключение] [Цвет]\`
- **Комплекты**: \`Комплект. [Компонент1] + [Компонент2]\`

### 3. Связи сущностей
Система использует 3-уровневую иерархию товаров:
1. **Категория** → Модель → База товара → Вариация товара
2. Каждый базовый товар порождает вариации по цвету, длине и поставщику
3. Комплекты связывают несколько вариаций вместе

### 4. Нормализация базы данных
- Все словари (цвета, разъёмы, протоколы, поставщики) полностью нормализованы
- Атрибуты товаров привязаны к категориям через динамическую схему
- Генерация SKU детерминирована через функции базы данных
- Генерация названий использует шаблонизатор с поиском по словарям

### 5. Дизайн масштабирования
- Первичные ключи UUID для глобальной уникальности
- Составные уникальные ограничения на SKU
- Поля JSONB для расширяемых атрибутов
- Row Level Security (RLS) для мультиарендного доступа
- Индексы полнотекстового поиска по названиям и SKU
`;

export const architectureNotes = architectureNotesRu;

// Сущности с описаниями
export const entitiesEn: EntityDefinition[] = [
  {
    name: 'categories',
    description: 'Product categories — top-level classification',
    fields: [
      { name: 'id', type: 'UUID', description: 'Primary key' },
      { name: 'code', type: 'VARCHAR(50)', description: 'Unique category code' },
      { name: 'name', type: 'VARCHAR(100)', description: 'English name' },
      { name: 'name_ru', type: 'VARCHAR(100)', description: 'Russian name' },
      { name: 'color', type: 'VARCHAR(7)', description: 'UI color hex' },
      { name: 'icon', type: 'VARCHAR(50)', description: 'Lucide icon name' },
      { name: 'sort_order', type: 'INTEGER', description: 'Display order' },
    ],
  },
  {
    name: 'models',
    description: 'Product models/lines within categories',
    fields: [
      { name: 'id', type: 'UUID', description: 'Primary key' },
      { name: 'category_id', type: 'UUID', description: 'FK to categories' },
      { name: 'code', type: 'VARCHAR(50)', description: 'Model code (ZS, PR, ST, etc.)' },
      { name: 'name', type: 'VARCHAR(100)', description: 'English name' },
      { name: 'name_ru', type: 'VARCHAR(100)', description: 'Russian name' },
    ],
  },
  {
    name: 'product_bases',
    description: 'Base product definitions without color/length variants',
    fields: [
      { name: 'id', type: 'UUID', description: 'Primary key' },
      { name: 'sku_base', type: 'VARCHAR(20)', description: 'Base SKU (S10002E)' },
      { name: 'category_id', type: 'UUID', description: 'FK to categories' },
      { name: 'model_id', type: 'UUID', description: 'FK to models' },
      { name: 'name_template', type: 'TEXT', description: 'Auto-naming template' },
      { name: 'body_material_id', type: 'UUID', description: 'FK to materials' },
      { name: 'wire_material_id', type: 'UUID', description: 'FK to materials' },
      { name: 'current_a', type: 'DECIMAL(4,2)', description: 'Current in Amperes' },
      { name: 'voltage_v', type: 'DECIMAL(5,2)', description: 'Voltage in Volts' },
      { name: 'power_w', type: 'DECIMAL(6,2)', description: 'Power in Watts' },
      { name: 'length_m', type: 'DECIMAL(4,2)', description: 'Length in meters' },
      { name: 'connector_female_id', type: 'UUID', description: 'FK to connectors' },
      { name: 'connector_male_id', type: 'UUID', description: 'FK to connectors' },
      { name: 'charging_protocol_id', type: 'UUID', description: 'FK to protocols' },
      { name: 'supplier_id', type: 'UUID', description: 'FK to suppliers' },
    ],
  },
  {
    name: 'product_variants',
    description: 'Actual sellable SKUs with all attribute combinations',
    fields: [
      { name: 'id', type: 'UUID', description: 'Primary key' },
      { name: 'product_base_id', type: 'UUID', description: 'FK to product_bases' },
      { name: 'sku', type: 'VARCHAR(30)', description: 'Full SKU (S10002E/01)' },
      { name: 'color_id', type: 'UUID', description: 'FK to colors' },
      { name: 'length_variant', type: 'VARCHAR(10)', description: 'Length variant override' },
      { name: 'supplier_suffix', type: 'VARCHAR(5)', description: 'Supplier suffix (-A, -W)' },
      { name: 'is_kit', type: 'BOOLEAN', description: 'Is a kit/combo product' },
      { name: 'full_name', type: 'TEXT', description: 'Generated full name' },
      { name: 'is_active', type: 'BOOLEAN', description: 'Active status' },
    ],
  },
  {
    name: 'colors',
    description: 'Color dictionary with codes and hex values',
    fields: [
      { name: 'id', type: 'UUID', description: 'Primary key' },
      { name: 'code', type: 'VARCHAR(10)', description: 'Color code (01, 02, 03)' },
      { name: 'name', type: 'VARCHAR(50)', description: 'English name' },
      { name: 'name_ru', type: 'VARCHAR(50)', description: 'Russian name' },
      { name: 'hex_value', type: 'VARCHAR(7)', description: 'Hex color code' },
    ],
  },
  {
    name: 'connectors',
    description: 'Connector types dictionary',
    fields: [
      { name: 'id', type: 'UUID', description: 'Primary key' },
      { name: 'code', type: 'VARCHAR(20)', description: 'Connector code (L, TC, USB)' },
      { name: 'name', type: 'VARCHAR(50)', description: 'English name' },
      { name: 'name_ru', type: 'VARCHAR(50)', description: 'Russian name' },
      { name: 'type', type: 'VARCHAR(10)', description: 'female/male/both' },
    ],
  },
  {
    name: 'charging_protocols',
    description: 'Charging protocol dictionary',
    fields: [
      { name: 'id', type: 'UUID', description: 'Primary key' },
      { name: 'code', type: 'VARCHAR(20)', description: 'Protocol code (PD, QC3, GaN)' },
      { name: 'name', type: 'VARCHAR(50)', description: 'English name' },
      { name: 'name_ru', type: 'VARCHAR(50)', description: 'Russian name' },
    ],
  },
  {
    name: 'suppliers',
    description: 'Supplier dictionary',
    fields: [
      { name: 'id', type: 'UUID', description: 'Primary key' },
      { name: 'code', type: 'VARCHAR(10)', description: 'Supplier code (A, W, AW)' },
      { name: 'name', type: 'VARCHAR(100)', description: 'Supplier name' },
    ],
  },
  {
    name: 'kit_components',
    description: 'Components within kit products',
    fields: [
      { name: 'id', type: 'UUID', description: 'Primary key' },
      { name: 'kit_variant_id', type: 'UUID', description: 'FK to product_variants (kit)' },
      { name: 'component_variant_id', type: 'UUID', description: 'FK to product_variants (component)' },
      { name: 'quantity', type: 'INTEGER', description: 'Quantity in kit' },
    ],
  },
  {
    name: 'product_media',
    description: 'Product images and videos',
    fields: [
      { name: 'id', type: 'UUID', description: 'Primary key' },
      { name: 'variant_id', type: 'UUID', description: 'FK to product_variants' },
      { name: 'media_type', type: 'VARCHAR(10)', description: 'image or video' },
      { name: 'url', type: 'TEXT', description: 'Storage URL' },
      { name: 'is_primary', type: 'BOOLEAN', description: 'Primary image flag' },
    ],
  },
];

// Русские описания сущностей
export const entitiesRu: EntityDefinition[] = [
  {
    name: 'categories',
    description: 'Категории товаров — классификация верхнего уровня',
    fields: [
      { name: 'id', type: 'UUID', description: 'Первичный ключ' },
      { name: 'code', type: 'VARCHAR(50)', description: 'Уникальный код категории' },
      { name: 'name', type: 'VARCHAR(100)', description: 'Название на английском' },
      { name: 'name_ru', type: 'VARCHAR(100)', description: 'Название на русском' },
      { name: 'color', type: 'VARCHAR(7)', description: 'Цвет в интерфейсе (hex)' },
      { name: 'icon', type: 'VARCHAR(50)', description: 'Название иконки Lucide' },
      { name: 'sort_order', type: 'INTEGER', description: 'Порядок отображения' },
    ],
  },
  {
    name: 'models',
    description: 'Модели/линейки товаров внутри категорий',
    fields: [
      { name: 'id', type: 'UUID', description: 'Первичный ключ' },
      { name: 'category_id', type: 'UUID', description: 'Внешний ключ к категориям' },
      { name: 'code', type: 'VARCHAR(50)', description: 'Код модели (ZS, PR, ST и т.д.)' },
      { name: 'name', type: 'VARCHAR(100)', description: 'Название на английском' },
      { name: 'name_ru', type: 'VARCHAR(100)', description: 'Название на русском' },
    ],
  },
  {
    name: 'product_bases',
    description: 'Базовые определения товаров без вариаций цвета/длины',
    fields: [
      { name: 'id', type: 'UUID', description: 'Первичный ключ' },
      { name: 'sku_base', type: 'VARCHAR(20)', description: 'Базовый SKU (S10002E)' },
      { name: 'category_id', type: 'UUID', description: 'Внешний ключ к категориям' },
      { name: 'model_id', type: 'UUID', description: 'Внешний ключ к моделям' },
      { name: 'name_template', type: 'TEXT', description: 'Шаблон авто-наименования' },
      { name: 'body_material_id', type: 'UUID', description: 'Внешний ключ к материалам' },
      { name: 'wire_material_id', type: 'UUID', description: 'Внешний ключ к материалам' },
      { name: 'current_a', type: 'DECIMAL(4,2)', description: 'Сила тока в Амперах' },
      { name: 'voltage_v', type: 'DECIMAL(5,2)', description: 'Напряжение в Вольтах' },
      { name: 'power_w', type: 'DECIMAL(6,2)', description: 'Мощность в Ваттах' },
      { name: 'length_m', type: 'DECIMAL(4,2)', description: 'Длина в метрах' },
      { name: 'connector_female_id', type: 'UUID', description: 'Внешний ключ к разъёмам' },
      { name: 'connector_male_id', type: 'UUID', description: 'Внешний ключ к разъёмам' },
      { name: 'charging_protocol_id', type: 'UUID', description: 'Внешний ключ к протоколам' },
      { name: 'supplier_id', type: 'UUID', description: 'Внешний ключ к поставщикам' },
    ],
  },
  {
    name: 'product_variants',
    description: 'Реализуемые SKU со всеми комбинациями атрибутов',
    fields: [
      { name: 'id', type: 'UUID', description: 'Первичный ключ' },
      { name: 'product_base_id', type: 'UUID', description: 'Внешний ключ к базовым товарам' },
      { name: 'sku', type: 'VARCHAR(30)', description: 'Полный SKU (S10002E/01)' },
      { name: 'color_id', type: 'UUID', description: 'Внешний ключ к цветам' },
      { name: 'length_variant', type: 'VARCHAR(10)', description: 'Переопределение длины' },
      { name: 'supplier_suffix', type: 'VARCHAR(5)', description: 'Суффикс поставщика (-A, -W)' },
      { name: 'is_kit', type: 'BOOLEAN', description: 'Является комплектом/комбо' },
      { name: 'full_name', type: 'TEXT', description: 'Сгенерированное полное название' },
      { name: 'is_active', type: 'BOOLEAN', description: 'Активный статус' },
    ],
  },
  {
    name: 'colors',
    description: 'Словарь цветов с кодами и hex-значениями',
    fields: [
      { name: 'id', type: 'UUID', description: 'Первичный ключ' },
      { name: 'code', type: 'VARCHAR(10)', description: 'Код цвета (01, 02, 03)' },
      { name: 'name', type: 'VARCHAR(50)', description: 'Название на английском' },
      { name: 'name_ru', type: 'VARCHAR(50)', description: 'Название на русском' },
      { name: 'hex_value', type: 'VARCHAR(7)', description: 'Hex-код цвета' },
    ],
  },
  {
    name: 'connectors',
    description: 'Словарь типов разъёмов',
    fields: [
      { name: 'id', type: 'UUID', description: 'Первичный ключ' },
      { name: 'code', type: 'VARCHAR(20)', description: 'Код разъёма (L, TC, USB)' },
      { name: 'name', type: 'VARCHAR(50)', description: 'Название на английском' },
      { name: 'name_ru', type: 'VARCHAR(50)', description: 'Название на русском' },
      { name: 'type', type: 'VARCHAR(10)', description: 'female/male/both' },
    ],
  },
  {
    name: 'charging_protocols',
    description: 'Словарь протоколов зарядки',
    fields: [
      { name: 'id', type: 'UUID', description: 'Первичный ключ' },
      { name: 'code', type: 'VARCHAR(20)', description: 'Код протокола (PD, QC3, GaN)' },
      { name: 'name', type: 'VARCHAR(50)', description: 'Название на английском' },
      { name: 'name_ru', type: 'VARCHAR(50)', description: 'Название на русском' },
    ],
  },
  {
    name: 'suppliers',
    description: 'Словарь поставщиков',
    fields: [
      { name: 'id', type: 'UUID', description: 'Первичный ключ' },
      { name: 'code', type: 'VARCHAR(10)', description: 'Код поставщика (A, W, AW)' },
      { name: 'name', type: 'VARCHAR(100)', description: 'Название поставщика' },
    ],
  },
  {
    name: 'kit_components',
    description: 'Компоненты внутри комплектов',
    fields: [
      { name: 'id', type: 'UUID', description: 'Первичный ключ' },
      { name: 'kit_variant_id', type: 'UUID', description: 'Внешний ключ к комплектным вариациям' },
      { name: 'component_variant_id', type: 'UUID', description: 'Внешний ключ к компонентным вариациям' },
      { name: 'quantity', type: 'INTEGER', description: 'Количество в комплекте' },
    ],
  },
  {
    name: 'product_media',
    description: 'Изображения и видео товаров',
    fields: [
      { name: 'id', type: 'UUID', description: 'Первичный ключ' },
      { name: 'variant_id', type: 'UUID', description: 'Внешний ключ к вариациям товаров' },
      { name: 'media_type', type: 'VARCHAR(10)', description: 'изображение или видео' },
      { name: 'url', type: 'TEXT', description: 'URL хранения' },
      { name: 'is_primary', type: 'BOOLEAN', description: 'Флаг главного изображения' },
    ],
  },
];

export const entities = entitiesRu;

// Связи
export const relationships: RelationshipDefinition[] = [
  { from: 'categories', to: 'models', type: '1:N', description: 'Одна категория содержит много моделей' },
  { from: 'categories', to: 'product_bases', type: '1:N', description: 'Одна категория содержит много товаров' },
  { from: 'models', to: 'product_bases', type: '1:N', description: 'Одна модель содержит много товаров' },
  { from: 'product_bases', to: 'product_variants', type: '1:N', description: 'Один базовый товар содержит много вариаций (цвета/длины)' },
  { from: 'colors', to: 'product_variants', type: '1:N', description: 'Один цвет используется во многих вариациях' },
  { from: 'suppliers', to: 'product_bases', type: '1:N', description: 'Один поставщик поставляет много товаров' },
  { from: 'connectors', to: 'product_bases', type: '1:N', description: 'Один тип разъёма используется во многих товарах' },
  { from: 'charging_protocols', to: 'product_bases', type: '1:N', description: 'Один протокол используется во многих товарах' },
  { from: 'product_variants', to: 'kit_components', type: '1:N', description: 'Один комплект содержит много компонентов' },
  { from: 'product_variants', to: 'product_media', type: '1:N', description: 'Одна вариация содержит много медиафайлов' },
];

export const systemArchitecture: SystemArchitecture = {
  entities,
  relationships,
  skuLogic,
  namingLogic,
};
