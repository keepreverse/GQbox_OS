import type { Category, Model, Supplier, Color, Connector, ChargingProtocol, Material, NamingTemplate, CategoryAttribute } from './types';

/**
 * СЛОВАРЬ GQBOX
 *
 * Семантика полей (для всех справочников):
 *   name     — ИСТОЧНИК    (левый столбец вашей таблицы; то, что идёт в артикул)
 *   nameRu   — ТОВАРНОЕ RU (правый столбец вашей таблицы; отображение в русской версии)
 *   nameEn?  — ТОВАРНОЕ EN (перевод правого столбца на английский)
 *
 * Значения берутся из словаря БЕЗ переформатирования и вольных переводов.
 * Если nameEn не указан — в EN режиме будет показан nameRu как есть.
 */

export const categories: Category[] = [
{ id: 'cat-cable',      code: 'cable',     name: 'Кабель',             nameRu: 'Кабель',           nameEn: 'Cable',             color: '#aa94ee', icon: 'Cable',          description: '', sortOrder: 1 },
  { id: 'cat-szu',        code: 'szu',       name: 'СЗУ',                nameRu: 'СЗУ',              nameEn: 'Wall Charger',      color: '#fbbf24', icon: 'Zap',            description: '', sortOrder: 2 },
  { id: 'cat-bzu',        code: 'bzu',       name: 'БЗУ',                nameRu: 'БЗУ',              nameEn: 'Wireless Charger',  color: '#34d399', icon: 'Wifi',           description: '', sortOrder: 3 },
  { id: 'cat-azu',        code: 'azu',       name: 'АЗУ',                nameRu: 'АЗУ',              nameEn: 'Car Charger',       color: '#f87171', icon: 'Car',            description: '', sortOrder: 4 },
  { id: 'cat-headphones', code: 'headphones',name: 'Наушники',           nameRu: 'Наушники',         nameEn: 'Headphones',        color: '#f472b6', icon: 'Headphones',     description: '', sortOrder: 5 },
  { id: 'cat-adapter',    code: 'adapter',   name: 'Переходник',         nameRu: 'Переходник',       nameEn: 'Adapter',           color: '#22d3ee', icon: 'ArrowLeftRight', description: '', sortOrder: 6 },
  { id: 'cat-pin',        code: 'pin',       name: 'Пин',                nameRu: 'Пин',              nameEn: 'Pin',               color: '#aa94ee', icon: 'Pin',            description: '', sortOrder: 7 },
  { id: 'cat-holder',     code: 'holder',    name: 'Держатель',          nameRu: 'Держатель',        nameEn: 'Holder',            color: '#a3e635', icon: 'GripVertical',   description: '', sortOrder: 8 },
  { id: 'cat-case',       code: 'case',      name: 'Чехол',              nameRu: 'Чехол',            nameEn: 'Case',              color: '#fb923c', icon: 'Smartphone',     description: '', sortOrder: 9 },
  { id: 'cat-kit',        code: 'kit',       name: 'Комплект',           nameRu: 'Комплект',         nameEn: 'Kit',               color: '#c084fc', icon: 'Package',        description: '', sortOrder: 10 },
  { id: 'cat-packaging',  code: 'packaging', name: 'Вложение/упаковка',  nameRu: 'Упаковка',         nameEn: 'Packaging',         color: '#94a3b8', icon: 'Archive',        description: '', sortOrder: 11 },
  { id: 'cat-blogo',      code: 'blogo',     name: 'Blogo',              nameRu: 'Blogo',            nameEn: 'Blogo',             color: '#2dd4bf', icon: 'Monitor',        description: '', sortOrder: 12 },
];

export const suppliers: Supplier[] = [
  { id: 'sup-angela', code: 'A',  name: 'Angela',        contactInfo: '' },
  { id: 'sup-wendy',  code: 'W',  name: 'Wendy',         contactInfo: '' },
  { id: 'sup-both',   code: 'AW', name: 'Angela+Wendy',  contactInfo: '' },
  { id: 'sup-none',   code: '-',  name: '—',             contactInfo: '' },
];

export const colors: Color[] = [
  { id: 'col-01',  code: '01',  name: 'ЧЕРНЫЙ',            nameRu: 'ЧЕРНЫЙ',           nameEn: 'BLACK',           hexValue: '#1a1a1a' },
  { id: 'col-22',  code: '22',  name: 'ТЕМНО-СЕРЫЙ',       nameRu: 'ТЕМНО-СЕРЫЙ',      nameEn: 'DARK GRAY',       hexValue: '#374151' },
  { id: 'col-36',  code: '36',  name: 'СЕРЫЙ',             nameRu: 'СЕРЫЙ',            nameEn: 'GRAY',            hexValue: '#6b7280' },
  { id: 'col-39',  code: '39',  name: 'СЕРЕБРО',           nameRu: 'СЕРЕБРО',          nameEn: 'SILVER',          hexValue: '#c0c0c0' },
  { id: 'col-02',  code: '02',  name: 'БЕЛЫЙ',             nameRu: 'БЕЛЫЙ',            nameEn: 'WHITE',           hexValue: '#f5f5f5' },
  { id: 'col-40',  code: '40',  name: 'АНТИЧНЫЙ БЕЛЫЙ',    nameRu: 'АНТИЧНЫЙ БЕЛЫЙ',   nameEn: 'ANTIQUE WHITE',   hexValue: '#faebd7' },
  { id: 'col-32',  code: '32',  name: 'БОРДОВЫЙ',          nameRu: 'БОРДОВЫЙ',         nameEn: 'BURGUNDY',        hexValue: '#800020' },
  { id: 'col-33',  code: '33',  name: 'МАЛИНОВЫЙ',         nameRu: 'МАЛИНОВЫЙ',        nameEn: 'CRIMSON',         hexValue: '#dc143c' },
  { id: 'col-03',  code: '03',  name: 'КРАСНЫЙ',           nameRu: 'КРАСНЫЙ',          nameEn: 'RED',             hexValue: '#dc2626' },
  { id: 'col-04',  code: '04',  name: 'КРАСНОЕ ЗОЛОТО',    nameRu: 'КРАСНОЕ ЗОЛОТО',   nameEn: 'RED GOLD',        hexValue: '#c0392b' },
  { id: 'col-06',  code: '06',  name: 'КОРИЧНЕВЫЙ',        nameRu: 'КОРИЧНЕВЫЙ',       nameEn: 'BROWN',           hexValue: '#92400e' },
  { id: 'col-05',  code: '05',  name: 'КОРАЛЛОВЫЙ',        nameRu: 'КОРАЛЛОВЫЙ',       nameEn: 'CORAL',           hexValue: '#ff7f50' },
  { id: 'col-07',  code: '07',  name: 'ОРАНЖЕВЫЙ',         nameRu: 'ОРАНЖЕВЫЙ',        nameEn: 'ORANGE',          hexValue: '#f97316' },
  { id: 'col-38',  code: '38',  name: 'ТЕМНО-БЕЖЕВЫЙ',     nameRu: 'ТЕМНО-БЕЖЕВЫЙ',    nameEn: 'DARK BEIGE',      hexValue: '#a1887f' },
  { id: 'col-09',  code: '09',  name: 'БЕЖЕВЫЙ',           nameRu: 'БЕЖЕВЫЙ',          nameEn: 'BEIGE',           hexValue: '#d4b896' },
  { id: 'col-08',  code: '08',  name: 'ПЕРСИКОВЫЙ',        nameRu: 'ПЕРСИКОВЫЙ',       nameEn: 'PEACH',           hexValue: '#ffdab9' },
  { id: 'col-10',  code: '10',  name: 'ЗОЛОТОЙ',           nameRu: 'ЗОЛОТОЙ',          nameEn: 'GOLD',            hexValue: '#fbbf24' },
  { id: 'col-11',  code: '11',  name: 'ЖЕЛТЫЙ',            nameRu: 'ЖЕЛТЫЙ',           nameEn: 'YELLOW',          hexValue: '#eab308' },
  { id: 'col-12',  code: '12',  name: 'АНТИЧНОЕ ЗОЛОТО',   nameRu: 'АНТИЧНОЕ ЗОЛОТО',  nameEn: 'ANTIQUE GOLD',    hexValue: '#cfb53b' },
  { id: 'col-13',  code: '13',  name: 'БОЛОТНЫЙ',          nameRu: 'БОЛОТНЫЙ',         nameEn: 'MARSH',           hexValue: '#556b2f' },
  { id: 'col-14',  code: '14',  name: 'САЛАТОВЫЙ',         nameRu: 'САЛАТОВЫЙ',        nameEn: 'LIGHT GREEN',     hexValue: '#84cc16' },
  { id: 'col-15',  code: '15',  name: 'СЕРО-ЗЕЛЕНЫЙ',      nameRu: 'СЕРО-ЗЕЛЕНЫЙ',     nameEn: 'GRAY-GREEN',      hexValue: '#8fbc8f' },
  { id: 'col-16',  code: '16',  name: 'ЗЕЛЕНЫЙ',           nameRu: 'ЗЕЛЕНЫЙ',          nameEn: 'GREEN',           hexValue: '#16a34a' },
  { id: 'col-17',  code: '17',  name: 'МЯТНЫЙ',            nameRu: 'МЯТНЫЙ',           nameEn: 'MINT',            hexValue: '#6ee7b7' },
  { id: 'col-18',  code: '18',  name: 'СИНЕ-ЗЕЛЕНЫЙ',      nameRu: 'СИНЕ-ЗЕЛЕНЫЙ',     nameEn: 'BLUE-GREEN',      hexValue: '#0d9488' },
  { id: 'col-19',  code: '19',  name: 'СЕРО-БИРЮЗОВЫЙ',    nameRu: 'СЕРО-БИРЮЗОВЫЙ',   nameEn: 'GRAY-TURQUOISE',  hexValue: '#5f9ea0' },
  { id: 'col-20',  code: '20',  name: 'БИРЮЗОВЫЙ',         nameRu: 'БИРЮЗОВЫЙ',        nameEn: 'TURQUOISE',       hexValue: '#06b6d4' },
  { id: 'col-21',  code: '21',  name: 'НЕБЕСНО-ГОЛУБОЙ',   nameRu: 'НЕБЕСНО-ГОЛУБОЙ',  nameEn: 'SKY BLUE',        hexValue: '#0ea5e9' },
  { id: 'col-37',  code: '37',  name: 'СЕРО-СИНИЙ',        nameRu: 'СЕРО-СИНИЙ',       nameEn: 'BLUE-GRAY',       hexValue: '#64748b' },
  { id: 'col-23',  code: '23',  name: 'ГОЛУБОЙ',           nameRu: 'ГОЛУБОЙ',          nameEn: 'BLUE',            hexValue: '#2563eb' },
  { id: 'col-24',  code: '24',  name: 'ЯРКО-СИНИЙ',        nameRu: 'ЯРКО-СИНИЙ',       nameEn: 'BRIGHT BLUE',     hexValue: '#1d4ed8' },
  { id: 'col-25',  code: '25',  name: 'СИНИЙ',             nameRu: 'СИНИЙ',            nameEn: 'NAVY',            hexValue: '#1e40af' },
  { id: 'col-26',  code: '26',  name: 'ФИАЛКОВЫЙ',         nameRu: 'ФИАЛКОВЫЙ',        nameEn: 'VIOLET',          hexValue: '#917af7' },
  { id: 'col-27',  code: '27',  name: 'СИРЕНЕВЫЙ',         nameRu: 'СИРЕНЕВЫЙ',        nameEn: 'LILAC',           hexValue: '#c084fc' },
  { id: 'col-28',  code: '28',  name: 'ФИОЛЕТОВЫЙ',        nameRu: 'ФИОЛЕТОВЫЙ',       nameEn: 'PURPLE',          hexValue: '#9333ea' },
  { id: 'col-31',  code: '31',  name: 'РОЗОВЫЙ',           nameRu: 'РОЗОВЫЙ',          nameEn: 'PINK',            hexValue: '#ec4899' },
  { id: 'col-30',  code: '30',  name: 'ЯРКО-РОЗОВЫЙ',      nameRu: 'ЯРКО-РОЗОВЫЙ',     nameEn: 'BRIGHT PINK',     hexValue: '#ff1493' },
  { id: 'col-29',  code: '29',  name: 'ПЫЛЬНО-РОЗОВЫЙ',    nameRu: 'ПЫЛЬНО-РОЗОВЫЙ',   nameEn: 'DUSTY PINK',      hexValue: '#f9a8d4' },
  { id: 'col-35',  code: '35',  name: 'НЕЖНО-РОЗОВЫЙ',     nameRu: 'НЕЖНО-РОЗОВЫЙ',    nameEn: 'SOFT PINK',       hexValue: '#ffb6c1' },
  { id: 'col-34',  code: '34',  name: 'РОЗОВОЕ ЗОЛОТО',    nameRu: 'РОЗОВОЕ ЗОЛОТО',   nameEn: 'ROSE GOLD',       hexValue: '#b76e79' },
  { id: 'col-41',  code: '41',  name: 'РАЗНОЦВЕТНЫЙ',      nameRu: 'РАЗНОЦВЕТНЫЙ',     nameEn: 'MULTICOLOR',      hexValue: 'gradient' },
];

export const connectors: Connector[] = [
  { id: 'conn-l',      code: 'L',       name: 'L',       nameRu: 'L',        nameEn: 'L' },
  { id: 'conn-usb',    code: 'USB',     name: 'USB',     nameRu: 'USB',      nameEn: 'USB' },
  { id: 'conn-tc',     code: 'TC',      name: 'TC',      nameRu: 'TC',       nameEn: 'TC' },
  { id: 'conn-micro',  code: 'Micro',   name: 'Micro',   nameRu: 'Micro',    nameEn: 'Micro' },
  { id: 'conn-jack',   code: 'Jack',    name: 'Jack',    nameRu: 'Jack',     nameEn: 'Jack' },
  { id: 'conn-30pin',  code: '30pin',   name: '30pin',   nameRu: '30pin',    nameEn: '30pin' },
  { id: 'conn-360',    code: '360',     name: '360',     nameRu: '360',      nameEn: '360' },
  { id: 'conn-usb2',   code: 'USB2',    name: 'USB2',    nameRu: '2USB',     nameEn: '2USB' },
  { id: 'conn-tc2',    code: 'TC2',     name: 'TC2',     nameRu: '2TC',      nameEn: '2TC' },
  { id: 'conn-l2',     code: 'L2',      name: 'L2',      nameRu: '2L',       nameEn: '2L' },
  { id: 'conn-ljack',  code: 'L+Jack',  name: 'L+Jack',  nameRu: 'L+Jack',   nameEn: 'L+Jack' },
  { id: 'conn-tcl',    code: 'TC-L',    name: 'TC-L',    nameRu: 'TC-L',     nameEn: 'TC-L' },
  { id: 'conn-tc2l',   code: 'TC2-L',   name: 'TC2-L',   nameRu: '2TC-L',    nameEn: '2TC-L' },
  { id: 'conn-usbtc',  code: 'USB-TC',  name: 'USB-TC',  nameRu: 'USB-TC',   nameEn: 'USB-TC' },
  { id: 'conn-usb3',   code: 'USB3',    name: 'USB3',    nameRu: '3USB',     nameEn: '3USB' },
  { id: 'conn-tc3',    code: 'TC3',     name: 'TC3',     nameRu: '3TC',      nameEn: '3TC' },
  { id: 'conn-l3',     code: 'L3',      name: 'L3',      nameRu: '3L',       nameEn: '3L' },
];

export const chargingProtocols: ChargingProtocol[] = [
  { id: 'proto-gan',        code: 'GaN',                  name: 'GaN',                  nameRu: 'GaN',                nameEn: 'GaN',                description: '' },
  { id: 'proto-pd',         code: 'PD',                   name: 'PD',                   nameRu: 'PD',                 nameEn: 'PD',                 description: '' },
  { id: 'proto-pd-qc3',     code: 'PD,QC3',               name: 'PD,QC3',               nameRu: 'PD,QC3',             nameEn: 'PD,QC3',             description: '' },
  { id: 'proto-pps-ufcs',   code: 'pd/pps/ufcs',          name: 'pd/pps/ufcs',          nameRu: 'pd/pps/ufcs',        nameEn: 'pd/pps/ufcs',        description: '' },
  { id: 'proto-pd-qc3-bc',  code: 'pd/qc3.0/bc',          name: 'pd/qc3.0/bc',          nameRu: 'pd/qc3.0/bc',        nameEn: 'pd/qc3.0/bc',        description: '' },
  { id: 'proto-qc',         code: 'QC',                   name: 'QC',                   nameRu: 'QC',                 nameEn: 'QC',                 description: '' },
  { id: 'proto-qc3-pd',     code: 'QC3.0+PD',             name: 'QC3.0+PD',             nameRu: 'QC3.0 22.5W+PD 30W', nameEn: 'QC3.0 22.5W+PD 30W', description: '' },
  { id: 'proto-qi1',        code: 'QI1',                  name: 'QI1',                  nameRu: 'QI1',                nameEn: 'QI1',                description: '' },
  { id: 'proto-qi2',        code: 'QI2',                  name: 'QI2',                  nameRu: 'QI2',                nameEn: 'QI2',                description: '' },
  { id: 'proto-multi',      code: 'multi',                name: 'multi',                nameRu: 'USB-TC:pd/qc3.0/bc; TC-TC:pd/pps/ufcs', nameEn: 'USB-TC:pd/qc3.0/bc; TC-TC:pd/pps/ufcs', description: '' },
];

export const materials: Material[] = [
  { id: 'mat-plastic', code: 'plastic',           name: 'пластик',       nameRu: 'пластик',          nameEn: 'plastic' },
  { id: 'mat-aluminum',code: 'aluminum',          name: 'алюминий',      nameRu: 'алюминий',         nameEn: 'aluminum' },
  { id: 'mat-alloy',   code: 'alloy',             name: 'алюминиевый сплав', nameRu: 'алюминиевый сплав', nameEn: 'aluminium alloy' },
  { id: 'mat-zinc',    code: 'zinc',              name: 'цинк',          nameRu: 'цинк',             nameEn: 'zinc' },
  { id: 'mat-carbon',  code: 'carbon',            name: 'карбон',        nameRu: 'карбон',           nameEn: 'carbon' },
  { id: 'mat-silicone',code: 'silicone',          name: 'силикон',       nameRu: 'силикон',          nameEn: 'silicone' },
  { id: 'mat-nylon',   code: 'nylon',             name: 'нейлон',        nameRu: 'нейлон',           nameEn: 'nylon' },
  { id: 'mat-magnet',  code: 'magnet',            name: 'магнит',        nameRu: 'магнит',           nameEn: 'magnet' },
];

export const models: Model[] = [
  { id: 'mod-zs',             categoryId: 'cat-cable',      code: 'ZS',            name: 'ZS',               nameRu: 'ZS',               nameEn: 'ZS' },
  { id: 'mod-pr',             categoryId: 'cat-cable',      code: 'PR',            name: 'PR',               nameRu: 'PR',               nameEn: 'PR' },
  { id: 'mod-st',             categoryId: 'cat-cable',      code: 'ST',            name: 'ST',               nameRu: 'ST',               nameEn: 'ST' },
  { id: 'mod-org',            categoryId: 'cat-cable',      code: 'ORG',           name: 'ORG',              nameRu: 'Orig',             nameEn: 'Orig' },
  { id: 'mod-old',            categoryId: 'cat-cable',      code: 'OLD',           name: 'OLD',              nameRu: 'Старый',           nameEn: 'Old' },
  { id: 'mod-braided',        categoryId: 'cat-cable',      code: 'braided',       name: 'braided',          nameRu: 'плетеный',         nameEn: 'braided' },
  { id: 'mod-braided-pr',     categoryId: 'cat-cable',      code: 'braided PR',    name: 'braided PR',       nameRu: 'плетеный PR',      nameEn: 'braided PR' },
  { id: 'mod-braided-org',    categoryId: 'cat-cable',      code: 'braided ORG',   name: 'braided ORG',      nameRu: 'плетеный Orig',    nameEn: 'braided Orig' },
  { id: 'mod-55w',            categoryId: 'cat-cable',      code: '55W',           name: '55W',              nameRu: 'ST',               nameEn: 'ST' },
  { id: 'mod-carbon',         categoryId: 'cat-cable',      code: 'Carbon',        name: 'Carbon',           nameRu: 'карбоновый',       nameEn: 'carbon' },
  { id: 'mod-carbon-spiral',  categoryId: 'cat-cable',      code: 'Carbon Spiral', name: 'Carbon Spiral',    nameRu: 'карбоновая спираль', nameEn: 'Carbon Spiral' },
  { id: 'mod-carbon-3in1',    categoryId: 'cat-cable',      code: 'Carbon 3in1',   name: 'Carbon 3in1',      nameRu: 'карбоновый 3в1',   nameEn: 'Carbon 3in1' },
  { id: 'mod-360',            categoryId: 'cat-cable',      code: '360',           name: '360',              nameRu: '360',              nameEn: '360' },
  { id: 'mod-magnet',         categoryId: 'cat-cable',      code: 'Magnet',        name: 'Magnet',           nameRu: 'магнитный',        nameEn: 'Magnet' },
  { id: 'mod-magnet-st',      categoryId: 'cat-cable',      code: 'Magnet ST',     name: 'Magnet ST',        nameRu: 'магнитный',        nameEn: 'Magnet ST' },
  { id: 'mod-male',           categoryId: 'cat-cable',      code: 'Male',          name: 'Male',             nameRu: 'Мужской',          nameEn: 'Male' },
  { id: 'mod-neck',           categoryId: 'cat-cable',      code: 'Neck',          name: 'Neck',             nameRu: 'ремешок',          nameEn: 'Neck' },
  { id: 'mod-cute',           categoryId: 'cat-cable',      code: 'Cute',          name: 'Cute',             nameRu: 'Женский',          nameEn: 'Cute' },
  { id: 'mod-pr-spiral',      categoryId: 'cat-cable',      code: 'PR Spiral',     name: 'PR Spiral',        nameRu: 'премиальный спиральный', nameEn: 'Premium Spiral' },
  { id: 'mod-silicone',       categoryId: 'cat-cable',      code: 'Silicone',      name: 'Silicone',         nameRu: 'силиконовый',      nameEn: 'Silicone' },
  { id: 'mod-game',           categoryId: 'cat-cable',      code: 'Game',          name: 'Game',             nameRu: 'угловой геймерский', nameEn: 'Gaming' },
  { id: 'mod-pl-thick',       categoryId: 'cat-cable',      code: 'PL Thick',      name: 'PL Thick',         nameRu: 'толстый плетеный', nameEn: 'Thick braided' },
  { id: 'mod-colour-zs',      categoryId: 'cat-cable',      code: 'Colour ZS',     name: 'Colour ZS',        nameRu: 'цветной ZS',       nameEn: 'Color ZS' },
  { id: 'mod-colour-braided', categoryId: 'cat-cable',      code: 'Colour braided',name: 'Colour braided',   nameRu: 'плетеный',         nameEn: 'braided' },
  { id: 'mod-watch',          categoryId: 'cat-cable',      code: 'WATCH',         name: 'WATCH',            nameRu: 'для зарядки Apple Watch', nameEn: 'Apple Watch charging' },
  { id: 'mod-watch-up',       categoryId: 'cat-cable',      code: 'WATCH UP',      name: 'WATCH UP',         nameRu: 'для Apple Watch плетеный', nameEn: 'Apple Watch braided' },
  { id: 'mod-1a',             categoryId: 'cat-szu',        code: '1A',            name: '1A',               nameRu: '1A',               nameEn: '1A' },
  { id: 'mod-pd',             categoryId: 'cat-szu',        code: 'PD',            name: 'PD',               nameRu: 'PD',               nameEn: 'PD' },
  { id: 'mod-qc3',            categoryId: 'cat-szu',        code: 'QC3',           name: 'QC3',              nameRu: 'QC3',              nameEn: 'QC3' },
  { id: 'mod-utc',            categoryId: 'cat-szu',        code: 'UTC',           name: 'UTC',              nameRu: 'UTC',              nameEn: 'UTC' },
  { id: 'mod-gan',            categoryId: 'cat-szu',        code: 'GAN',           name: 'GAN',              nameRu: 'GaN',              nameEn: 'GaN' },
  { id: 'mod-y9',             categoryId: 'cat-bzu',        code: 'Y9',            name: 'Y9',               nameRu: 'Станция Y9',       nameEn: 'Y9 Station' },
  { id: 'mod-y58',            categoryId: 'cat-bzu',        code: 'Y58',           name: 'Y58',              nameRu: 'Одиночная станция Y58', nameEn: 'Single station Y58' },
  { id: 'mod-m2',             categoryId: 'cat-bzu',        code: 'M2',            name: 'M2',               nameRu: 'Разборная станция M2', nameEn: 'Detachable station M2' },
  { id: 'mod-y93',            categoryId: 'cat-bzu',        code: 'Y93',           name: 'Y93',              nameRu: 'Компактная станция Y93', nameEn: 'Compact station Y93' },
  { id: 'mod-vacuum',         categoryId: 'cat-bzu',        code: 'Vacuum',        name: 'Vacuum',           nameRu: 'вакуумная',        nameEn: 'vacuum' },
  { id: 'mod-folding',        categoryId: 'cat-bzu',        code: 'Folding',       name: 'Folding',          nameRu: 'раскладываемая',   nameEn: 'folding' },
  { id: 'mod-rgb',            categoryId: 'cat-azu',        code: 'RGB',           name: 'RGB',              nameRu: 'RGB',              nameEn: 'RGB' },
  { id: 'mod-hammer',         categoryId: 'cat-azu',        code: 'Hammer',        name: 'Hammer',           nameRu: 'Hammer',           nameEn: 'Hammer' },
  { id: 'mod-invisible',      categoryId: 'cat-azu',        code: 'Invisible',     name: 'Invisible',        nameRu: 'Невидимка',        nameEn: 'Invisible' },
  { id: 'mod-bullet',         categoryId: 'cat-azu',        code: 'Bullet',        name: 'Bullet',           nameRu: 'Патрон',           nameEn: 'Bullet' },
  { id: 'mod-stick',          categoryId: 'cat-azu',        code: 'Stick',         name: 'Stick',            nameRu: 'удлиненный',       nameEn: 'Stick' },
  { id: 'mod-carbon-azu',     categoryId: 'cat-azu',        code: 'Carbon',        name: 'Carbon',           nameRu: 'карбоновый',       nameEn: 'Carbon' },
  { id: 'mod-earpads',        categoryId: 'cat-headphones', code: 'EarPads',       name: 'EarPads',          nameRu: 'EarPads',          nameEn: 'EarPads' },
  { id: 'mod-earpads-org',    categoryId: 'cat-headphones', code: 'EarPads ORG',   name: 'EarPads ORG',      nameRu: 'EarPads Ориг',     nameEn: 'EarPads Orig' },
  { id: 'mod-earpads-pr',     categoryId: 'cat-headphones', code: 'EarPads PR',    name: 'EarPads PR',       nameRu: 'EarPads Премиум',  nameEn: 'EarPads PR' },
  { id: 'mod-earpads-clr',    categoryId: 'cat-headphones', code: 'EarPads CLR',   name: 'EarPads CLR',      nameRu: 'EarPads Color',    nameEn: 'EarPads Color' },
  { id: 'mod-metal',          categoryId: 'cat-headphones', code: 'Metal',         name: 'Metal',            nameRu: 'Metal',            nameEn: 'Metal' },
  { id: 'mod-pro',            categoryId: 'cat-headphones', code: 'PRO',           name: 'PRO',              nameRu: 'PRO',              nameEn: 'PRO' },
  { id: 'mod-pro-orig',       categoryId: 'cat-headphones', code: 'PRO Orig',      name: 'PRO Orig',         nameRu: 'PRO Orig',         nameEn: 'PRO Orig' },
  { id: 'mod-pro-pr',         categoryId: 'cat-headphones', code: 'PRO PR',        name: 'PRO PR',           nameRu: 'PRO PR',           nameEn: 'PRO PR' },
  { id: 'mod-popup',          categoryId: 'cat-headphones', code: 'POPUP',         name: 'POPUP',            nameRu: 'POPUP',            nameEn: 'POPUP' },
  { id: 'mod-popup-orig',     categoryId: 'cat-headphones', code: 'POPUP ORIG',    name: 'POPUP ORIG',       nameRu: 'POPUP Orig',       nameEn: 'POPUP Orig' },
  { id: 'mod-popup-pr',       categoryId: 'cat-headphones', code: 'POPUP PR',      name: 'POPUP PR',         nameRu: 'POPUP PR',         nameEn: 'POPUP PR' },
  { id: 'mod-old-st',         categoryId: 'cat-adapter',    code: 'OLD ST',        name: 'OLD ST',           nameRu: 'OLD ST',           nameEn: 'OLD ST' },
  { id: 'mod-old-pr',         categoryId: 'cat-adapter',    code: 'OLD PR',        name: 'OLD PR',           nameRu: 'OLD PR',           nameEn: 'OLD PR' },
  { id: 'mod-old-adapter',    categoryId: 'cat-adapter',    code: 'OLD',           name: 'OLD',              nameRu: 'Старый',           nameEn: 'Old' },
  { id: 'mod-pin',            categoryId: 'cat-pin',        code: 'PIN',           name: 'PIN',              nameRu: 'Пин',              nameEn: 'Pin' },
  { id: 'mod-old-holder',     categoryId: 'cat-holder',     code: 'OLD',           name: 'OLD',              nameRu: 'Старый',           nameEn: 'Old' },
  { id: 'mod-butterfly',      categoryId: 'cat-case',       code: 'Butterfly',     name: 'Butterfly',        nameRu: 'Бабочка',          nameEn: 'Butterfly' },
  { id: 'mod-icecream',       categoryId: 'cat-case',       code: 'IceCream',      name: 'IceCream',         nameRu: 'Мороженка',        nameEn: 'IceCream' },
  { id: 'mod-heart',          categoryId: 'cat-case',       code: 'Heart',         name: 'Heart',            nameRu: 'Сердечко',         nameEn: 'Heart' },
  { id: 'mod-china-braided-pr',categoryId: 'cat-kit',      code: 'China braided PR', name: 'China braided PR', nameRu: 'PD + плетеный PR', nameEn: 'PD + braided PR' },
  { id: 'mod-china-pr',       categoryId: 'cat-kit',        code: 'China PR',      name: 'China PR',         nameRu: 'PD + PR',          nameEn: 'PD + PR' },
  { id: 'mod-china-st',       categoryId: 'cat-kit',        code: 'China ST',      name: 'China ST',         nameRu: 'PD + ST',          nameEn: 'PD + ST' },
  { id: 'mod-items',          categoryId: 'cat-packaging',  code: 'items',         name: 'items',            nameRu: 'Предмет',          nameEn: 'items' },
  { id: 'mod-box',            categoryId: 'cat-packaging',  code: 'box',           name: 'box',              nameRu: 'Коробка',          nameEn: 'box' },
  { id: 'mod-box-items',      categoryId: 'cat-packaging',  code: 'box-items',     name: 'box-items',        nameRu: 'Коробка предмет',  nameEn: 'box-items' },
  { id: 'mod-screen-mirror',  categoryId: 'cat-blogo',      code: 'Screen Mirror', name: 'Screen Mirror',    nameRu: 'повторитель экрана', nameEn: 'Screen Mirror' },
];

export const namingTemplates: NamingTemplate[] = [
  { id: 'nt-cable',    categoryId: 'cat-cable',    template: 'Кабель. {female}-{male} {model} {length}м {color}',      templateRu: 'Кабель. {female}-{male} {model} {length}м {color}',       isDefault: true },
  { id: 'nt-szu',      categoryId: 'cat-szu',      template: 'СЗУ. {protocol} {connector} {power}W {color}',           templateRu: 'СЗУ. {protocol} {connector} {power}W {color}',            isDefault: true },
  { id: 'nt-bzu',      categoryId: 'cat-bzu',      template: 'БЗУ. {model} {protocol} {color}',                        templateRu: 'БЗУ. {model} {protocol} {color}',                         isDefault: true },
  { id: 'nt-azu',      categoryId: 'cat-azu',      template: 'АЗУ. {model} {connector} {power}W {color}',              templateRu: 'АЗУ. {model} {connector} {power}W {color}',               isDefault: true },
  { id: 'nt-headphones',categoryId: 'cat-headphones',template: 'Наушники. {connector} {model} {connection} {color}',   templateRu: 'Наушники. {connector} {model} {connection} {color}',    isDefault: true },
  { id: 'nt-adapter',  categoryId: 'cat-adapter',  template: 'Переходник. {model} {female}-{male} {connection}',       templateRu: 'Переходник. {model} {female}-{male} {connection}',        isDefault: true },
  { id: 'nt-pin',      categoryId: 'cat-pin',      template: 'Пин. {connector}',                                       templateRu: 'Пин. {connector}',                                          isDefault: true },
  { id: 'nt-holder',   categoryId: 'cat-holder',   template: 'Держатель. {model} {color}',                             templateRu: 'Держатель. {model} {color}',                                isDefault: true },
  { id: 'nt-case',     categoryId: 'cat-case',     template: 'Чехол ЗУ. {model} {color}',                              templateRu: 'Чехол ЗУ. {model} {color}',                                 isDefault: true },
  { id: 'nt-kit',      categoryId: 'cat-kit',      template: 'Комплект. {components}',                                 templateRu: 'Комплект. {components}',                                    isDefault: true },
];

export const categoryAttributes: CategoryAttribute[] = [
  { id: 'attr-cable-body',       categoryId: 'cat-cable', attributeCode: 'body_material',    attributeName: 'Body Material',    attributeNameRu: 'Материал корпуса',    dataType: 'select', isRequired: true,  sortOrder: 1 },
  { id: 'attr-cable-wire',       categoryId: 'cat-cable', attributeCode: 'wire_material',    attributeName: 'Wire Material',    attributeNameRu: 'Материал провода',    dataType: 'select', isRequired: true,  sortOrder: 2 },
  { id: 'attr-cable-current',    categoryId: 'cat-cable', attributeCode: 'current',          attributeName: 'Current (A)',      attributeNameRu: 'Сила тока, А',        dataType: 'number', isRequired: false, sortOrder: 3 },
  { id: 'attr-cable-voltage',    categoryId: 'cat-cable', attributeCode: 'voltage',          attributeName: 'Voltage (V)',      attributeNameRu: 'Выходное напряжение, V',dataType: 'number', isRequired: false, sortOrder: 4 },
  { id: 'attr-cable-power',      categoryId: 'cat-cable', attributeCode: 'power',            attributeName: 'Power (W)',        attributeNameRu: 'Мощность, W',         dataType: 'number', isRequired: false, sortOrder: 5 },
  { id: 'attr-cable-length',     categoryId: 'cat-cable', attributeCode: 'length',           attributeName: 'Length (m)',       attributeNameRu: 'Длина, м',            dataType: 'number', isRequired: true,  sortOrder: 6 },
  { id: 'attr-cable-data',       categoryId: 'cat-cable', attributeCode: 'data_transfer',    attributeName: 'Data Transfer',    attributeNameRu: 'Передача данных, Мб/с', dataType: 'number', isRequired: false, sortOrder: 7 },
  { id: 'attr-cable-devices',    categoryId: 'cat-cable', attributeCode: 'device_count',     attributeName: 'Device Count',     attributeNameRu: 'Количество устройств',dataType: 'number', isRequired: false, sortOrder: 8 },
  { id: 'attr-cable-female',     categoryId: 'cat-cable', attributeCode: 'connector_female', attributeName: 'Female Connector', attributeNameRu: 'Разъем мама',         dataType: 'select', isRequired: true,  sortOrder: 9 },
  { id: 'attr-cable-male',       categoryId: 'cat-cable', attributeCode: 'connector_male',   attributeName: 'Male Connector',   attributeNameRu: 'Разъем папа',         dataType: 'select', isRequired: true,  sortOrder: 10 },
  { id: 'attr-cable-protocol',   categoryId: 'cat-cable', attributeCode: 'protocol',         attributeName: 'Protocol',         attributeNameRu: 'Протокол зарядки',    dataType: 'select', isRequired: false, sortOrder: 11 },
  { id: 'attr-szu-body',         categoryId: 'cat-szu',   attributeCode: 'body_material',    attributeName: 'Body Material',    attributeNameRu: 'Материал корпуса',    dataType: 'select', isRequired: true,  sortOrder: 1 },
  { id: 'attr-szu-power',        categoryId: 'cat-szu',   attributeCode: 'power',            attributeName: 'Power (W)',        attributeNameRu: 'Мощность, W',         dataType: 'number', isRequired: true,  sortOrder: 2 },
  { id: 'attr-szu-devices',      categoryId: 'cat-szu',   attributeCode: 'device_count',     attributeName: 'Device Count',     attributeNameRu: 'Количество устройств',dataType: 'number', isRequired: false, sortOrder: 3 },
  { id: 'attr-szu-female',       categoryId: 'cat-szu',   attributeCode: 'connector_female', attributeName: 'Output Connector', attributeNameRu: 'Разъем выхода',       dataType: 'select', isRequired: true,  sortOrder: 4 },
  { id: 'attr-szu-protocol',     categoryId: 'cat-szu',   attributeCode: 'protocol',         attributeName: 'Protocol',         attributeNameRu: 'Протокол зарядки',    dataType: 'select', isRequired: false, sortOrder: 5 },
  { id: 'attr-headphones-body',  categoryId: 'cat-headphones', attributeCode: 'body_material', attributeName: 'Body Material', attributeNameRu: 'Материал корпуса', dataType: 'select', isRequired: true, sortOrder: 1 },
  { id: 'attr-headphones-wire',  categoryId: 'cat-headphones', attributeCode: 'wire_material', attributeName: 'Wire Material', attributeNameRu: 'Материал провода', dataType: 'select', isRequired: true, sortOrder: 2 },
  { id: 'attr-headphones-conn',  categoryId: 'cat-headphones', attributeCode: 'connector',     attributeName: 'Connector',     attributeNameRu: 'Разъем',             dataType: 'select', isRequired: true,  sortOrder: 3 },
  { id: 'attr-headphones-ctype', categoryId: 'cat-headphones', attributeCode: 'connection_type',attributeName: 'Connection Type',attributeNameRu: 'Тип подключения',   dataType: 'select', isRequired: true,  sortOrder: 4 },
];

export function getCategoryById(id: string): Category | undefined {
  return categories.find(c => c.id === id);
}

export function getModelById(id: string): Model | undefined {
  return models.find(m => m.id === id);
}

export function getSupplierById(id: string): Supplier | undefined {
  return suppliers.find(s => s.id === id);
}

export function getColorById(id: string): Color | undefined {
  return colors.find(c => c.id === id);
}

export function getConnectorById(id: string): Connector | undefined {
  return connectors.find(c => c.id === id);
}

export function getProtocolById(id: string): ChargingProtocol | undefined {
  return chargingProtocols.find(p => p.id === id);
}

export function getMaterialById(id: string): Material | undefined {
  return materials.find(m => m.id === id);
}

export function getModelsByCategory(categoryId: string): Model[] {
  return models.filter(m => m.categoryId === categoryId);
}

export function getAttributesByCategory(categoryId: string): CategoryAttribute[] {
  return categoryAttributes.filter(a => a.categoryId === categoryId).sort((a, b) => a.sortOrder - b.sortOrder);
}
