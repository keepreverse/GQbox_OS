import type { Language } from '../context/LanguageContext';

const cyrillicRegex = /[А-Яа-яЁё]/;

const sourceTranslations: Record<string, string> = {
  'АЗУ': 'Car Charger',
  'БЗУ': 'Wireless Charger',
  'Вложение/упаковка': 'Packaging',
  'Держатель': 'Holder',
  'Кабель': 'Cable',
  'Комплект': 'Kit',
  'Наушники': 'Headphones',
  'Переходник': 'Adapter',
  'Пин': 'Pin',
  'СЗУ': 'Wall Charger',
  'Чехол': 'Case',
  'ЧЕРНЫЙ': 'BLACK',
  'БЕЛЫЙ': 'WHITE',
  'КРАСНЫЙ': 'RED',
  'ЗОЛОТОЙ': 'GOLD',
  'РОЗОВЫЙ': 'PINK',
  'ГОЛУБОЙ': 'LIGHT BLUE',
  'СИНИЙ': 'BLUE',
  'ЖЕЛТЫЙ': 'YELLOW',
  'ОРАНЖЕВЫЙ': 'ORANGE',
  'СЕРЕБРО': 'SILVER',
  'ФИОЛЕТОВЫЙ': 'PURPLE',
  'МАЛИНОВЫЙ': 'CRIMSON',
  'СИРЕНЕВЫЙ': 'LILAC',
  'САЛАТОВЫЙ': 'LIGHT GREEN',
  'БИРЮЗОВЫЙ': 'TURQUOISE',
  'СЕРЫЙ': 'GRAY',
  'ЗЕЛЕНЫЙ': 'GREEN',
  'МЯТНЫЙ': 'MINT',
  'СЕРОСИНИЙ': 'BLUE-GRAY',
  'ТЕМНОБЕЖЕВЫЙ': 'DARK BEIGE',
  'СИНЕ-ЗЕЛЕНЫЙ': 'BLUE-GREEN',
  'КОРИЧНЕВЫЙ': 'BROWN',
  'БЕЖЕВЫЙ': 'BEIGE',
  'ФИАЛКОВЫЙ': 'VIOLET',
  'БОЛОТНЫЙ': 'MARSH',
  'БОРДОВЫЙ': 'BURGUNDY',
  'СЕРО-ЗЕЛЕНЫЙ': 'GRAY-GREEN',
  'НЕБЕСНО-ГОЛУБОЙ': 'SKY BLUE',
  'ПЕРСИКОВЫЙ': 'PEACH',
  'КОРАЛЛОВЫЙ': 'CORAL',
  'ЯРКО-СИНИЙ': 'BRIGHT BLUE',
  'СЕРО-БИРЮЗОВЫЙ': 'GRAY-TURQUOISE',
  'КРАСНОЕ ЗОЛОТО': 'RED GOLD',
  'РОЗОВОЕ ЗОЛОТО': 'ROSE GOLD',
  'ПЫЛЬНО-РОЗОВЫЙ': 'DUSTY PINK',
  'ЯРКО-РОЗОВЫЙ': 'BRIGHT PINK',
  'РАЗНОЦВЕТНЫЙ': 'MULTICOLOR',
  'АНТИЧНОЕ ЗОЛОТО': 'ANTIQUE GOLD',
  'ТЕМНО-СЕРЫЙ': 'DARK GRAY',
  'АНТИЧНЫЙ БЕЛЫЙ': 'ANTIQUE WHITE',
  'НЕЖНО - РОЗОВЫЙ': 'SOFT PINK',
  'НЕЖНО-РОЗОВЫЙ': 'SOFT PINK',
  'пластик': 'plastic',
  'алюминий': 'aluminum',
  'алюминиевый сплав': 'aluminium alloy',
  'цинк': 'zinc',
  'карбон': 'carbon',
  'силикон': 'silicone',
  'нейлон': 'nylon',
  'магнит': 'magnet',
};

/**
 * Отображение словарного значения.
 *
 * Семантика полей:
 *  - name     : ИСТОЧНИК   (левый столбец словаря, код для артикула)
 *  - nameRu   : ТОВАРНОЕ RU (правый столбец словаря)
 *  - nameEn?  : ТОВАРНОЕ EN (перевод правого столбца; fallback → nameRu)
 *
 * Правило:
 *  - RU → nameRu (как есть из правого столбца словаря)
 *  - EN → nameEn (если указано), иначе fallback на nameRu
 */
/**
 * Товарное название (для генерации наименований товаров).
 * RU → nameRu, EN → nameEn || nameRu
 */
export function displayName(
  item: { name?: string; nameRu?: string; nameEn?: string; code?: string },
  language: Language,
): string {
  if (language === 'ru') {
    return item.nameRu || item.name || item.code || '';
  }
  if (item.nameEn) return item.nameEn;
  if (item.name && !cyrillicRegex.test(item.name)) return item.name;
  return item.nameRu || item.name || item.code || '';
}

/**
 * Источник (для UI: фильтры, списки, конструктор, сборка комплектов).
 * Всегда возвращает поле `name` (левый столбец словаря, без точки).
 */
export function displaySource(
  item: { name?: string; sourceEn?: string; code?: string; categoryId?: string; type?: string; nameRu?: string },
  language: Language = 'ru',
): string {
  if (language === 'en') {
    if (item.sourceEn) return item.sourceEn;
    if (item.categoryId && item.code) return item.code;
    if (item.type && item.code) return item.code;
    const source = item.name || item.nameRu || item.code || '';
    return sourceTranslations[source] || source;
  }

  if (item.categoryId && item.code) return item.code;
  if (item.type && item.code) return item.code;
  if (item.name && cyrillicRegex.test(item.name)) return item.name;
  if (item.nameRu && cyrillicRegex.test(item.nameRu)) return item.nameRu;
  return item.name || item.code || '';
}

/**
 * CSS-переменная цвета категории (для inline-стилей).
 * Возвращает var(--color-cable) и т.д.
 * Для Recharts/SVG используйте hex из category.color напрямую.
 */
export function getCategoryColorVar(code: string): string {
  const map: Record<string, string> = {
    cable: 'var(--color-cable)',
    szu: 'var(--color-szu)',
    bzu: 'var(--color-bzu)',
    azu: 'var(--color-azu)',
    headphones: 'var(--color-headphones)',
    adapter: 'var(--color-adapter)',
    pin: 'var(--color-pin)',
    holder: 'var(--color-holder)',
    case: 'var(--color-case)',
    kit: 'var(--color-kit)',
    packaging: 'var(--color-packaging)',
    blogo: 'var(--color-blogo)',
  };
  return map[code] || 'var(--color-accent)';
}

export function displayProductName(
  item: { fullName?: string; fullNameRu?: string; fullNameEn?: string },
  language: Language,
): string {
  if (language === 'ru') return item.fullNameRu || item.fullName || '';
  return item.fullNameEn || item.fullName || item.fullNameRu || '';
}

export function getColorHexValue(hexValue: string): string {
  return hexValue === 'gradient' 
    ? 'conic-gradient(#ff0000 0deg 18deg, #ff7f00 18deg 54deg, #ffff00 54deg 90deg, #80ff00 90deg 126deg, #00ff00 126deg 162deg, #00ffff 162deg 198deg, #0000ff 198deg 234deg, #8000ff 234deg 270deg, #ff00ff 270deg 306deg, #ff007f 306deg 342deg, #ff0000 342deg 360deg)' 
    : hexValue;
}
