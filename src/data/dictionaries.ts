import type { Category, Model, Supplier, Color, Connector, ChargingProtocol, Material, NamingTemplate, CategoryAttribute } from './types';
import { loadFromStore, saveToStore } from './store';

/**
 * СЛОВАРЬ GQBOX
 *
 * Семантика полей (для всех справочников):
 *   name_source — ИСТОЧНИК (левый столбец; то, что идёт в артикул)
 *   name_product — ТОВАРНОЕ название (правый столбец; отображение в обеих локалях)
 */

const categories: Category[] = [
{ id: 'cat-cable',      code: 'cable', name_source: 'Кабель',             name_product: 'Кабель',             color: '#aa94ee', icon: 'Cable',          description: '', sortOrder: 1 },
  { id: 'cat-szu',        code: 'szu', name_source: 'СЗУ',                name_product: 'СЗУ',      color: '#fbbf24', icon: 'Zap',            description: '', sortOrder: 2 },
  { id: 'cat-bzu',        code: 'bzu', name_source: 'БЗУ',                name_product: 'БЗУ',  color: '#34d399', icon: 'Wifi',           description: '', sortOrder: 3 },
  { id: 'cat-azu',        code: 'azu', name_source: 'АЗУ',                name_product: 'АЗУ',       color: '#f87171', icon: 'Car',            description: '', sortOrder: 4 },
  { id: 'cat-headphones', code: 'headphones',name_source: 'Наушники',           name_product: 'Наушники',        color: '#f472b6', icon: 'Headphones',     description: '', sortOrder: 5 },
  { id: 'cat-adapter',    code: 'adapter', name_source: 'Переходник',         name_product: 'Переходник',           color: '#22d3ee', icon: 'ArrowLeftRight', description: '', sortOrder: 6 },
  { id: 'cat-pin',        code: 'pin', name_source: 'Пин',                name_product: 'Пин',               color: '#aa94ee', icon: 'Pin',            description: '', sortOrder: 7 },
  { id: 'cat-holder',     code: 'holder', name_source: 'Держатель',          name_product: 'Держатель',            color: '#a3e635', icon: 'GripVertical',   description: '', sortOrder: 8 },
  { id: 'cat-case',       code: 'case', name_source: 'Чехол',              name_product: 'Чехол',              color: '#fb923c', icon: 'Smartphone',     description: '', sortOrder: 9 },
  { id: 'cat-kit',        code: 'kit', name_source: 'Комплект',           name_product: 'Комплект',               color: '#c084fc', icon: 'Package',        description: '', sortOrder: 10 },
  { id: 'cat-packaging',  code: 'packaging', name_source: 'Вложение/упаковка',  name_product: 'Упаковка',         color: '#94a3b8', icon: 'Archive',        description: '', sortOrder: 11 },
  { id: 'cat-blogo',      code: 'blogo', name_source: 'Blogo',              name_product: 'Blogo',             color: '#2dd4bf', icon: 'Monitor',        description: '', sortOrder: 12 },
];

const suppliers: Supplier[] = [
  { id: 'sup-angela', code: 'A',  name: 'Angela',        contactInfo: '' },
  { id: 'sup-wendy',  code: 'W',  name: 'Wendy',         contactInfo: '' },
  { id: 'sup-both',   code: 'AW', name: 'Angela+Wendy',  contactInfo: '' },
  { id: 'sup-none',   code: '-',  name: '—',             contactInfo: '' },
];

const colors: Color[] = [
  { id: 'col-01',  code: '01', name_source: 'ЧЕРНЫЙ',            name_product: 'ЧЕРНЫЙ',           hexValue: '#1a1a1a' },
  { id: 'col-22',  code: '22', name_source: 'ТЕМНО-СЕРЫЙ',       name_product: 'ТЕМНО-СЕРЫЙ',       hexValue: '#374151' },
  { id: 'col-36',  code: '36', name_source: 'СЕРЫЙ',             name_product: 'СЕРЫЙ',            hexValue: '#6b7280' },
  { id: 'col-39',  code: '39', name_source: 'СЕРЕБРО',           name_product: 'СЕРЕБРО',          hexValue: '#c0c0c0' },
  { id: 'col-02',  code: '02', name_source: 'БЕЛЫЙ',             name_product: 'БЕЛЫЙ',           hexValue: '#f5f5f5' },
  { id: 'col-40',  code: '40', name_source: 'АНТИЧНЫЙ БЕЛЫЙ',    name_product: 'АНТИЧНЫЙ БЕЛЫЙ',   hexValue: '#faebd7' },
  { id: 'col-32',  code: '32', name_source: 'БОРДОВЫЙ',          name_product: 'БОРДОВЫЙ',        hexValue: '#800020' },
  { id: 'col-33',  code: '33', name_source: 'МАЛИНОВЫЙ',         name_product: 'МАЛИНОВЫЙ',         hexValue: '#dc143c' },
  { id: 'col-03',  code: '03', name_source: 'КРАСНЫЙ',           name_product: 'КРАСНЫЙ',             hexValue: '#dc2626' },
  { id: 'col-04',  code: '04', name_source: 'КРАСНОЕ ЗОЛОТО',    name_product: 'КРАСНОЕ ЗОЛОТО',        hexValue: '#c0392b' },
  { id: 'col-06',  code: '06', name_source: 'КОРИЧНЕВЫЙ',        name_product: 'КОРИЧНЕВЫЙ',           hexValue: '#92400e' },
  { id: 'col-05',  code: '05', name_source: 'КОРАЛЛОВЫЙ',        name_product: 'КОРАЛЛОВЫЙ',           hexValue: '#ff7f50' },
  { id: 'col-07',  code: '07', name_source: 'ОРАНЖЕВЫЙ',         name_product: 'ОРАНЖЕВЫЙ',          hexValue: '#f97316' },
  { id: 'col-38',  code: '38', name_source: 'ТЕМНО-БЕЖЕВЫЙ',     name_product: 'ТЕМНО-БЕЖЕВЫЙ',      hexValue: '#a1887f' },
  { id: 'col-09',  code: '09', name_source: 'БЕЖЕВЫЙ',           name_product: 'БЕЖЕВЫЙ',           hexValue: '#d4b896' },
  { id: 'col-08',  code: '08', name_source: 'ПЕРСИКОВЫЙ',        name_product: 'ПЕРСИКОВЫЙ',           hexValue: '#ffdab9' },
  { id: 'col-10',  code: '10', name_source: 'ЗОЛОТОЙ',           name_product: 'ЗОЛОТОЙ',            hexValue: '#fbbf24' },
  { id: 'col-11',  code: '11', name_source: 'ЖЕЛТЫЙ',            name_product: 'ЖЕЛТЫЙ',          hexValue: '#eab308' },
  { id: 'col-12',  code: '12', name_source: 'АНТИЧНОЕ ЗОЛОТО',   name_product: 'АНТИЧНОЕ ЗОЛОТО',    hexValue: '#cfb53b' },
  { id: 'col-13',  code: '13', name_source: 'БОЛОТНЫЙ',          name_product: 'БОЛОТНЫЙ',           hexValue: '#556b2f' },
  { id: 'col-14',  code: '14', name_source: 'САЛАТОВЫЙ',         name_product: 'САЛАТОВЫЙ',     hexValue: '#84cc16' },
  { id: 'col-15',  code: '15', name_source: 'СЕРО-ЗЕЛЕНЫЙ',      name_product: 'СЕРО-ЗЕЛЕНЫЙ',      hexValue: '#8fbc8f' },
  { id: 'col-16',  code: '16', name_source: 'ЗЕЛЕНЫЙ',           name_product: 'ЗЕЛЕНЫЙ',           hexValue: '#16a34a' },
  { id: 'col-17',  code: '17', name_source: 'МЯТНЫЙ',            name_product: 'МЯТНЫЙ',            hexValue: '#6ee7b7' },
  { id: 'col-18',  code: '18', name_source: 'СИНЕ-ЗЕЛЕНЫЙ',      name_product: 'СИНЕ-ЗЕЛЕНЫЙ',      hexValue: '#0d9488' },
  { id: 'col-19',  code: '19', name_source: 'СЕРО-БИРЮЗОВЫЙ',    name_product: 'СЕРО-БИРЮЗОВЫЙ',  hexValue: '#5f9ea0' },
  { id: 'col-20',  code: '20', name_source: 'БИРЮЗОВЫЙ',         name_product: 'БИРЮЗОВЫЙ',       hexValue: '#06b6d4' },
  { id: 'col-21',  code: '21', name_source: 'НЕБЕСНО-ГОЛУБОЙ',   name_product: 'НЕБЕСНО-ГОЛУБОЙ',        hexValue: '#0ea5e9' },
  { id: 'col-37',  code: '37', name_source: 'СЕРО-СИНИЙ',        name_product: 'СЕРО-СИНИЙ',       hexValue: '#64748b' },
  { id: 'col-23',  code: '23', name_source: 'ГОЛУБОЙ',           name_product: 'ГОЛУБОЙ',            hexValue: '#2563eb' },
  { id: 'col-24',  code: '24', name_source: 'ЯРКО-СИНИЙ',        name_product: 'ЯРКО-СИНИЙ',     hexValue: '#1d4ed8' },
  { id: 'col-25',  code: '25', name_source: 'СИНИЙ',             name_product: 'СИНИЙ',            hexValue: '#1e40af' },
  { id: 'col-26',  code: '26', name_source: 'ФИАЛКОВЫЙ',         name_product: 'ФИАЛКОВЫЙ',          hexValue: '#917af7' },
  { id: 'col-27',  code: '27', name_source: 'СИРЕНЕВЫЙ',         name_product: 'СИРЕНЕВЫЙ',           hexValue: '#c084fc' },
  { id: 'col-28',  code: '28', name_source: 'ФИОЛЕТОВЫЙ',        name_product: 'ФИОЛЕТОВЫЙ',          hexValue: '#9333ea' },
  { id: 'col-31',  code: '31', name_source: 'РОЗОВЫЙ',           name_product: 'РОЗОВЫЙ',            hexValue: '#ec4899' },
  { id: 'col-30',  code: '30', name_source: 'ЯРКО-РОЗОВЫЙ',      name_product: 'ЯРКО-РОЗОВЫЙ',     hexValue: '#ff1493' },
  { id: 'col-29',  code: '29', name_source: 'ПЫЛЬНО-РОЗОВЫЙ',    name_product: 'ПЫЛЬНО-РОЗОВЫЙ',      hexValue: '#f9a8d4' },
  { id: 'col-35',  code: '35', name_source: 'НЕЖНО-РОЗОВЫЙ',     name_product: 'НЕЖНО-РОЗОВЫЙ',       hexValue: '#ffb6c1' },
  { id: 'col-34',  code: '34', name_source: 'РОЗОВОЕ ЗОЛОТО',    name_product: 'РОЗОВОЕ ЗОЛОТО',       hexValue: '#b76e79' },
  { id: 'col-41',  code: '41', name_source: 'РАЗНОЦВЕТНЫЙ',      name_product: 'РАЗНОЦВЕТНЫЙ',      hexValue: 'gradient' },
];

const connectors: Connector[] = [
  { id: 'conn-l',      code: 'L', name_source: 'L',       name_product: 'L' },
  { id: 'conn-usb',    code: 'USB', name_source: 'USB',     name_product: 'USB' },
  { id: 'conn-tc',     code: 'TC', name_source: 'TC',      name_product: 'TC' },
  { id: 'conn-micro',  code: 'Micro', name_source: 'Micro',   name_product: 'Micro' },
  { id: 'conn-jack',   code: 'Jack', name_source: 'Jack',    name_product: 'Jack' },
  { id: 'conn-30pin',  code: '30pin', name_source: '30pin',   name_product: '30pin' },
  { id: 'conn-360',    code: '360', name_source: '360',     name_product: '360' },
  { id: 'conn-usb2',   code: 'USB2', name_source: 'USB2',    name_product: '2USB' },
  { id: 'conn-tc2',    code: 'TC2', name_source: 'TC2',     name_product: '2TC' },
  { id: 'conn-l2',     code: 'L2', name_source: 'L2',      name_product: '2L' },
  { id: 'conn-ljack',  code: 'L+Jack', name_source: 'L+Jack',  name_product: 'L+Jack' },
  { id: 'conn-tcl',    code: 'TC-L', name_source: 'TC-L',    name_product: 'TC-L' },
  { id: 'conn-tc2l',   code: 'TC2-L', name_source: 'TC2-L',   name_product: '2TC-L' },
  { id: 'conn-usbtc',  code: 'USB-TC', name_source: 'USB-TC',  name_product: 'USB-TC' },
  { id: 'conn-usb3',   code: 'USB3', name_source: 'USB3',    name_product: '3USB' },
  { id: 'conn-tc3',    code: 'TC3', name_source: 'TC3',     name_product: '3TC' },
  { id: 'conn-l3',     code: 'L3', name_source: 'L3',      name_product: '3L' },
];

const chargingProtocols: ChargingProtocol[] = [
  { id: 'proto-gan',        code: 'GaN', name_source: 'GaN',                  name_product: 'GaN',                description: '' },
  { id: 'proto-pd',         code: 'PD', name_source: 'PD',                   name_product: 'PD',                 description: '' },
  { id: 'proto-pd-qc3',     code: 'PD,QC3', name_source: 'PD,QC3',               name_product: 'PD,QC3',             description: '' },
  { id: 'proto-pps-ufcs',   code: 'pd/pps/ufcs', name_source: 'pd/pps/ufcs',          name_product: 'pd/pps/ufcs',        description: '' },
  { id: 'proto-pd-qc3-bc',  code: 'pd/qc3.0/bc', name_source: 'pd/qc3.0/bc',          name_product: 'pd/qc3.0/bc',        description: '' },
  { id: 'proto-qc',         code: 'QC', name_source: 'QC',                   name_product: 'QC',                 description: '' },
  { id: 'proto-qc3-pd',     code: 'QC3.0+PD', name_source: 'QC3.0+PD',             name_product: 'QC3.0 22.5W+PD 30W', description: '' },
  { id: 'proto-qi1',        code: 'QI1', name_source: 'QI1',                  name_product: 'QI1',                description: '' },
  { id: 'proto-qi2',        code: 'QI2', name_source: 'QI2',                  name_product: 'QI2',                description: '' },
  { id: 'proto-multi',      code: 'multi', name_source: 'multi',                name_product: 'USB-TC:pd/qc3.0/bc; TC-TC:pd/pps/ufcs', description: '' },
];

const materials: Material[] = [
  { id: 'mat-plastic', code: 'plastic', name_source: 'пластик',       name_product: 'пластик' },
  { id: 'mat-aluminum',code: 'aluminum', name_source: 'алюминий',      name_product: 'алюминий' },
  { id: 'mat-alloy',   code: 'alloy', name_source: 'алюминиевый сплав', name_product: 'алюминиевый сплав' },
  { id: 'mat-zinc',    code: 'zinc', name_source: 'цинк',          name_product: 'цинк' },
  { id: 'mat-carbon',  code: 'carbon', name_source: 'карбон',        name_product: 'карбон' },
  { id: 'mat-silicone',code: 'silicone', name_source: 'силикон',       name_product: 'силикон' },
  { id: 'mat-nylon',   code: 'nylon', name_source: 'нейлон',        name_product: 'нейлон' },
  { id: 'mat-magnet',  code: 'magnet', name_source: 'магнит',        name_product: 'магнит' },
];

const models: Model[] = [
  { id: 'mod-zs',             categoryId: 'cat-cable',      code: 'ZS', name_source: 'ZS',               name_product: 'ZS' },
  { id: 'mod-pr',             categoryId: 'cat-cable',      code: 'PR', name_source: 'PR',               name_product: 'PR' },
  { id: 'mod-st',             categoryId: 'cat-cable',      code: 'ST', name_source: 'ST',               name_product: 'ST' },
  { id: 'mod-org',            categoryId: 'cat-cable',      code: 'ORG', name_source: 'ORG',              name_product: 'Orig' },
  { id: 'mod-old',            categoryId: 'cat-cable',      code: 'OLD', name_source: 'OLD',              name_product: 'Старый' },
  { id: 'mod-braided',        categoryId: 'cat-cable',      code: 'braided', name_source: 'braided',          name_product: 'плетеный' },
  { id: 'mod-braided-pr',     categoryId: 'cat-cable',      code: 'braided PR', name_source: 'braided PR',       name_product: 'плетеный PR' },
  { id: 'mod-braided-org',    categoryId: 'cat-cable',      code: 'braided ORG', name_source: 'braided ORG',      name_product: 'плетеный Orig' },
  { id: 'mod-55w',            categoryId: 'cat-cable',      code: '55W', name_source: '55W',              name_product: 'ST' },
  { id: 'mod-carbon',         categoryId: 'cat-cable',      code: 'Carbon', name_source: 'Carbon',           name_product: 'карбоновый' },
  { id: 'mod-carbon-spiral',  categoryId: 'cat-cable',      code: 'Carbon Spiral', name_source: 'Carbon Spiral',    name_product: 'карбоновая спираль' },
  { id: 'mod-carbon-3in1',    categoryId: 'cat-cable',      code: 'Carbon 3in1', name_source: 'Carbon 3in1',      name_product: 'карбоновый 3в1' },
  { id: 'mod-360',            categoryId: 'cat-cable',      code: '360', name_source: '360',              name_product: '360' },
  { id: 'mod-magnet',         categoryId: 'cat-cable',      code: 'Magnet', name_source: 'Magnet',           name_product: 'магнитный' },
  { id: 'mod-magnet-st',      categoryId: 'cat-cable',      code: 'Magnet ST', name_source: 'Magnet ST',        name_product: 'магнитный' },
  { id: 'mod-male',           categoryId: 'cat-cable',      code: 'Male', name_source: 'Male',             name_product: 'Мужской' },
  { id: 'mod-neck',           categoryId: 'cat-cable',      code: 'Neck', name_source: 'Neck',             name_product: 'ремешок' },
  { id: 'mod-cute',           categoryId: 'cat-cable',      code: 'Cute', name_source: 'Cute',             name_product: 'Женский' },
  { id: 'mod-pr-spiral',      categoryId: 'cat-cable',      code: 'PR Spiral', name_source: 'PR Spiral',        name_product: 'премиальный спиральный' },
  { id: 'mod-silicone',       categoryId: 'cat-cable',      code: 'Silicone', name_source: 'Silicone',         name_product: 'силиконовый' },
  { id: 'mod-game',           categoryId: 'cat-cable',      code: 'Game', name_source: 'Game',             name_product: 'угловой геймерский' },
  { id: 'mod-pl-thick',       categoryId: 'cat-cable',      code: 'PL Thick', name_source: 'PL Thick',         name_product: 'толстый плетеный' },
  { id: 'mod-colour-zs',      categoryId: 'cat-cable',      code: 'Colour ZS', name_source: 'Colour ZS',        name_product: 'цветной ZS' },
  { id: 'mod-colour-braided', categoryId: 'cat-cable',      code: 'Colour braided',name_source: 'Colour braided',   name_product: 'плетеный' },
  { id: 'mod-watch',          categoryId: 'cat-cable',      code: 'WATCH', name_source: 'WATCH',            name_product: 'для зарядки Apple Watch' },
  { id: 'mod-watch-up',       categoryId: 'cat-cable',      code: 'WATCH UP', name_source: 'WATCH UP',         name_product: 'для Apple Watch плетеный' },
  { id: 'mod-1a',             categoryId: 'cat-szu',        code: '1A', name_source: '1A',               name_product: '1A' },
  { id: 'mod-pd',             categoryId: 'cat-szu',        code: 'PD', name_source: 'PD',               name_product: 'PD' },
  { id: 'mod-qc3',            categoryId: 'cat-szu',        code: 'QC3', name_source: 'QC3',              name_product: 'QC3' },
  { id: 'mod-utc',            categoryId: 'cat-szu',        code: 'UTC', name_source: 'UTC',              name_product: 'UTC' },
  { id: 'mod-gan',            categoryId: 'cat-szu',        code: 'GAN', name_source: 'GAN',              name_product: 'GaN' },
  { id: 'mod-y9',             categoryId: 'cat-bzu',        code: 'Y9', name_source: 'Y9',               name_product: 'Станция Y9' },
  { id: 'mod-y58',            categoryId: 'cat-bzu',        code: 'Y58', name_source: 'Y58',              name_product: 'Одиночная станция Y58' },
  { id: 'mod-m2',             categoryId: 'cat-bzu',        code: 'M2', name_source: 'M2',               name_product: 'Разборная станция M2' },
  { id: 'mod-y93',            categoryId: 'cat-bzu',        code: 'Y93', name_source: 'Y93',              name_product: 'Компактная станция Y93' },
  { id: 'mod-vacuum',         categoryId: 'cat-bzu',        code: 'Vacuum', name_source: 'Vacuum',           name_product: 'вакуумная' },
  { id: 'mod-folding',        categoryId: 'cat-bzu',        code: 'Folding', name_source: 'Folding',          name_product: 'раскладываемая' },
  { id: 'mod-rgb',            categoryId: 'cat-azu',        code: 'RGB', name_source: 'RGB',              name_product: 'RGB' },
  { id: 'mod-hammer',         categoryId: 'cat-azu',        code: 'Hammer', name_source: 'Hammer',           name_product: 'Hammer' },
  { id: 'mod-invisible',      categoryId: 'cat-azu',        code: 'Invisible', name_source: 'Invisible',        name_product: 'Невидимка' },
  { id: 'mod-bullet',         categoryId: 'cat-azu',        code: 'Bullet', name_source: 'Bullet',           name_product: 'Патрон' },
  { id: 'mod-stick',          categoryId: 'cat-azu',        code: 'Stick', name_source: 'Stick',            name_product: 'удлиненный' },
  { id: 'mod-carbon-azu',     categoryId: 'cat-azu',        code: 'Carbon', name_source: 'Carbon',           name_product: 'карбоновый' },
  { id: 'mod-earpads',        categoryId: 'cat-headphones', code: 'EarPads', name_source: 'EarPads',          name_product: 'EarPads' },
  { id: 'mod-earpads-org',    categoryId: 'cat-headphones', code: 'EarPads ORG', name_source: 'EarPads ORG',      name_product: 'EarPads Ориг' },
  { id: 'mod-earpads-pr',     categoryId: 'cat-headphones', code: 'EarPads PR', name_source: 'EarPads PR',       name_product: 'EarPads Премиум' },
  { id: 'mod-earpads-clr',    categoryId: 'cat-headphones', code: 'EarPads CLR', name_source: 'EarPads CLR',      name_product: 'EarPads Color' },
  { id: 'mod-metal',          categoryId: 'cat-headphones', code: 'Metal', name_source: 'Metal',            name_product: 'Metal' },
  { id: 'mod-pro',            categoryId: 'cat-headphones', code: 'PRO', name_source: 'PRO',              name_product: 'PRO' },
  { id: 'mod-pro-orig',       categoryId: 'cat-headphones', code: 'PRO Orig', name_source: 'PRO Orig',         name_product: 'PRO Orig' },
  { id: 'mod-pro-pr',         categoryId: 'cat-headphones', code: 'PRO PR', name_source: 'PRO PR',           name_product: 'PRO PR' },
  { id: 'mod-popup',          categoryId: 'cat-headphones', code: 'POPUP', name_source: 'POPUP',            name_product: 'POPUP' },
  { id: 'mod-popup-orig',     categoryId: 'cat-headphones', code: 'POPUP ORIG', name_source: 'POPUP ORIG',       name_product: 'POPUP Orig' },
  { id: 'mod-popup-pr',       categoryId: 'cat-headphones', code: 'POPUP PR', name_source: 'POPUP PR',         name_product: 'POPUP PR' },
  { id: 'mod-old-st',         categoryId: 'cat-adapter',    code: 'OLD ST', name_source: 'OLD ST',           name_product: 'OLD ST' },
  { id: 'mod-old-pr',         categoryId: 'cat-adapter',    code: 'OLD PR', name_source: 'OLD PR',           name_product: 'OLD PR' },
  { id: 'mod-old-adapter',    categoryId: 'cat-adapter',    code: 'OLD', name_source: 'OLD',              name_product: 'Старый' },
  { id: 'mod-pin',            categoryId: 'cat-pin',        code: 'PIN', name_source: 'PIN',              name_product: 'Пин' },
  { id: 'mod-old-holder',     categoryId: 'cat-holder',     code: 'OLD', name_source: 'OLD',              name_product: 'Старый' },
  { id: 'mod-butterfly',      categoryId: 'cat-case',       code: 'Butterfly', name_source: 'Butterfly',        name_product: 'Бабочка' },
  { id: 'mod-icecream',       categoryId: 'cat-case',       code: 'IceCream', name_source: 'IceCream',         name_product: 'Мороженка' },
  { id: 'mod-heart',          categoryId: 'cat-case',       code: 'Heart', name_source: 'Heart',            name_product: 'Сердечко' },
  { id: 'mod-china-braided-pr',categoryId: 'cat-kit',      code: 'China braided PR', name_source: 'China braided PR', name_product: 'PD + плетеный PR' },
  { id: 'mod-china-pr',       categoryId: 'cat-kit',        code: 'China PR', name_source: 'China PR',         name_product: 'PD + PR' },
  { id: 'mod-china-st',       categoryId: 'cat-kit',        code: 'China ST', name_source: 'China ST',         name_product: 'PD + ST' },
  { id: 'mod-items',          categoryId: 'cat-packaging',  code: 'items', name_source: 'items',            name_product: 'Предмет' },
  { id: 'mod-box',            categoryId: 'cat-packaging',  code: 'box', name_source: 'box',              name_product: 'Коробка' },
  { id: 'mod-box-items',      categoryId: 'cat-packaging',  code: 'box-items', name_source: 'box-items',        name_product: 'Коробка предмет' },
  { id: 'mod-screen-mirror',  categoryId: 'cat-blogo',      code: 'Screen Mirror', name_source: 'Screen Mirror',    name_product: 'повторитель экрана' },
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
  { id: 'attr-headphones-ctype', categoryId: 'cat-headphones', attributeCode: 'connection_type',attributeName: 'Connection Type',attributeNameRu: 'Тип подключения',   dataType: 'select', isRequired: true, sortOrder: 4 },
];

// ─── Загрузка из localStorage с fallback на дефолты ──────────────────────────

type DictType = 'categories' | 'models' | 'colors' | 'suppliers' | 'connectors' | 'chargingProtocols' | 'materials';

function loadDict<T>(key: DictType, defaults: T[]): T[] {
  const stored = loadFromStore<T[]>(key);
  return stored && Array.isArray(stored) ? stored : defaults;
}

function saveDict<T>(key: DictType, data: T[]): void {
  saveToStore(key, data);
}

// Инициализация: загрузка из store или дефолтов
let _categories = loadDict('categories', categories);
let _models = loadDict('models', models);
let _colors = loadDict('colors', colors);
let _suppliers = loadDict('suppliers', suppliers);
let _connectors = loadDict('connectors', connectors);
let _chargingProtocols = loadDict('chargingProtocols', chargingProtocols);
let _materials = loadDict('materials', materials);

// Экспорт через getter-ы (проксируемые массивы)
export { _categories as categories };
export { _models as models };
export { _colors as colors };
export { _suppliers as suppliers };
export { _connectors as connectors };
export { _chargingProtocols as chargingProtocols };
export { _materials as materials };

// ─── CRUD-операции по словарям ──────────────────────────────────────────────

export function addCategory(item: Category): void {
  _categories.push(item);
  saveDict('categories', _categories);
}
export function updateCategory(id: string, updates: Partial<Category>): void {
  const idx = _categories.findIndex(c => c.id === id);
  if (idx !== -1) { _categories[idx] = { ..._categories[idx], ...updates }; saveDict('categories', _categories); }
}
export function deleteCategory(id: string): void {
  _categories = _categories.filter(c => c.id !== id);
  saveDict('categories', _categories);
}

export function addModel(item: Model): void {
  _models.push(item);
  saveDict('models', _models);
}
export function updateModel(id: string, updates: Partial<Model>): void {
  const idx = _models.findIndex(m => m.id === id);
  if (idx !== -1) { _models[idx] = { ..._models[idx], ...updates }; saveDict('models', _models); }
}
export function deleteModel(id: string): void {
  _models = _models.filter(m => m.id !== id);
  saveDict('models', _models);
}

export function addColor(item: Color): void {
  _colors.push(item);
  saveDict('colors', _colors);
}
export function updateColor(id: string, updates: Partial<Color>): void {
  const idx = _colors.findIndex(c => c.id === id);
  if (idx !== -1) { _colors[idx] = { ..._colors[idx], ...updates }; saveDict('colors', _colors); }
}
export function deleteColor(id: string): void {
  _colors = _colors.filter(c => c.id !== id);
  saveDict('colors', _colors);
}

export function addSupplier(item: Supplier): void {
  _suppliers.push(item);
  saveDict('suppliers', _suppliers);
}
export function updateSupplier(id: string, updates: Partial<Supplier>): void {
  const idx = _suppliers.findIndex(s => s.id === id);
  if (idx !== -1) { _suppliers[idx] = { ..._suppliers[idx], ...updates }; saveDict('suppliers', _suppliers); }
}
export function deleteSupplier(id: string): void {
  _suppliers = _suppliers.filter(s => s.id !== id);
  saveDict('suppliers', _suppliers);
}

export function addConnector(item: Connector): void {
  _connectors.push(item);
  saveDict('connectors', _connectors);
}
export function updateConnector(id: string, updates: Partial<Connector>): void {
  const idx = _connectors.findIndex(c => c.id === id);
  if (idx !== -1) { _connectors[idx] = { ..._connectors[idx], ...updates }; saveDict('connectors', _connectors); }
}
export function deleteConnector(id: string): void {
  _connectors = _connectors.filter(c => c.id !== id);
  saveDict('connectors', _connectors);
}

export function addProtocol(item: ChargingProtocol): void {
  _chargingProtocols.push(item);
  saveDict('chargingProtocols', _chargingProtocols);
}
export function updateProtocol(id: string, updates: Partial<ChargingProtocol>): void {
  const idx = _chargingProtocols.findIndex(p => p.id === id);
  if (idx !== -1) { _chargingProtocols[idx] = { ..._chargingProtocols[idx], ...updates }; saveDict('chargingProtocols', _chargingProtocols); }
}
export function deleteProtocol(id: string): void {
  _chargingProtocols = _chargingProtocols.filter(p => p.id !== id);
  saveDict('chargingProtocols', _chargingProtocols);
}

export function addMaterial(item: Material): void {
  _materials.push(item);
  saveDict('materials', _materials);
}
export function updateMaterial(id: string, updates: Partial<Material>): void {
  const idx = _materials.findIndex(m => m.id === id);
  if (idx !== -1) { _materials[idx] = { ..._materials[idx], ...updates }; saveDict('materials', _materials); }
}
export function deleteMaterial(id: string): void {
  _materials = _materials.filter(m => m.id !== id);
  saveDict('materials', _materials);
}

export function resetDictionaries(): void {
  // Сбрасываем все к дефолтным значениям (перечитываем модуль)
  _categories = [...categories];
  _models = [...models];
  _colors = [...colors];
  _suppliers = [...suppliers];
  _connectors = [...connectors];
  _chargingProtocols = [...chargingProtocols];
  _materials = [...materials];
  saveDict('categories', _categories);
  saveDict('models', _models);
  saveDict('colors', _colors);
  saveDict('suppliers', _suppliers);
  saveDict('connectors', _connectors);
  saveDict('chargingProtocols', _chargingProtocols);
  saveDict('materials', _materials);
}

export function getCategoryById(id: string): Category | undefined {
  return _categories.find(c => c.id === id);
}

export function getModelById(id: string): Model | undefined {
  return _models.find(m => m.id === id);
}

export function getSupplierById(id: string): Supplier | undefined {
  return _suppliers.find(s => s.id === id);
}

export function getColorById(id: string): Color | undefined {
  return _colors.find(c => c.id === id);
}

export function getConnectorById(id: string): Connector | undefined {
  return _connectors.find(c => c.id === id);
}

export function getProtocolById(id: string): ChargingProtocol | undefined {
  return _chargingProtocols.find(p => p.id === id);
}

export function getMaterialById(id: string): Material | undefined {
  return _materials.find(m => m.id === id);
}

export function getModelsByCategory(categoryId: string): Model[] {
  return _models.filter(m => m.categoryId === categoryId);
}

export function getAttributesByCategory(categoryId: string): CategoryAttribute[] {
  return categoryAttributes.filter(a => a.categoryId === categoryId).sort((a, b) => a.sortOrder - b.sortOrder);
}

// Экспорт дефолтных данных для seed-скрипта сервера
export const _defaultCategories = [...categories];
export const _defaultModels = [...models];
export const _defaultColors = [...colors];
export const _defaultSuppliers = [...suppliers];
export const _defaultConnectors = [...connectors];
export const _defaultChargingProtocols = [...chargingProtocols];
export const _defaultMaterials = [...materials];
