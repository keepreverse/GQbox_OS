import { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'ru' | 'en';

interface Translations {
  [key: string]: string;
}

const translations: Record<Language, Translations> = {
  ru: {
    // Navigation
    'nav.dashboard': 'Дэшборд',
    'nav.architecture': 'Архитектура системы',
    'nav.matrix': 'Товарная матрица',
    'nav.sku-constructor': 'Конструктор SKU',
    'nav.dictionary': 'Справочники',
    'nav.kit-builder': 'Сборка комплектов',
    'nav.media': 'Медиа-менеджер',
    'nav.ai-hub': 'Ассистент AI',
    'nav.analysis': 'Анализ',
    'nav.beta': 'Бета',

    // Header & Layout
    'sidebar.tagline': 'Система продукта',
    'header.search': 'Поиск товаров...',
    'header.notifications': 'Уведомления',
    'header.settings': 'Настройки профиля',
    'header.team': 'Команда продукта',
    'header.admin': 'Администратор',

    // Dashboard
    'dash.title': 'Дэшборд',
    'dash.subtitle': 'Ключевые метрики и статистика',
    'dash.updated': 'Последнее обновление:',
    'dash.total': 'Всего товаров',
    'dash.active': 'Активных SKU',
    'dash.kits': 'Комплектов',
    'dash.categories': 'Категорий',
    'dash.catDist': 'Распределение по категориям',
    'dash.powerDist': 'Распределение по мощности',
    'dash.recent': 'Недавние товары',
    'dash.viewAll': 'Смотреть все',
    'dash.supplierDist': 'Распределение по поставщикам',
    'dash.alerts': 'Системные уведомления',
    'dash.items': 'Товары',

    // Architecture
    'arch.title': 'Архитектура системы',
    'arch.subtitle': 'Глубокий анализ архитектуры, логики SKU и структуры БД',
    'arch.tab.overview': 'Сводка',
    'arch.tab.sku': 'Логика SKU',
    'arch.tab.naming': 'Логика названий',
    'arch.tab.schema': 'Схема БД',
    'arch.tab.system': 'Системный дизайн',
    'arch.summary.title': 'Сводка архитектурного анализа',
    'arch.summary.entities': 'Сущности',
    'arch.summary.relationships': 'Связи',
    'arch.summary.categories': 'Категории',
    'arch.summary.sku_pattern': 'Паттерн SKU',
    'arch.summary.name_templates': 'Шаблоны названий',
    'arch.summary.validation_rules': 'Правила валидации',
    'arch.summary.normalized_tables': 'Нормализованные таблицы',
    'arch.summary.foreign_keys': 'Внешние ключи',
    'arch.summary.product_types': 'Типы товаров',
    'arch.summary.encoding_segments': 'Сегменты кодирования',
    'arch.summary.auto_generation_rules': 'Правила автогенерации',
    'arch.summary.data_integrity': 'Целостность данных',
    'arch.sku.title': 'Паттерн генерации SKU',
    'arch.sku.rules_title': 'Правила валидации SKU',
    'arch.naming.title': 'Паттерн названий товаров',
    'arch.naming.rules_title': 'Правила названий по категориям',
    'arch.schema.title': 'Связи сущностей БД',
    'arch.schema.relationships_title': 'Связи таблиц',
    'arch.schema.close': 'Закрыть',
    'arch.schema.fields': 'полей',
    'arch.system.frontend_title': 'Фронтенд Архитектура',
    'arch.system.backend_title': 'Бэкенд Архитектура',
    'arch.system.ai_title': 'Дизайн AI-готовой базы знаний',
    'arch.system.vector_embeddings': 'Векторные вложения',
    'arch.system.structured_metadata': 'Структурированные метаданные',
    'arch.system.content_templates': 'Шаблоны контента',
    'arch.system.attribute_graph': 'Граф атрибутов',
    'arch.system.media_analysis': 'Анализ медиа',
    'arch.system.multi_language': 'Мультиязычность',

    // Matrix
    'matrix.title': 'Товарная матрица',
    'matrix.subtitle': 'товаров в каталоге',
    'matrix.export': 'Экспорт',
    'matrix.search': 'Поиск по SKU, названию, модели...',
    'matrix.filters': 'Фильтры',
    'matrix.clear': 'Сбросить все',
    'matrix.cat': 'Категории',
    'matrix.sup': 'Поставщики',
    'matrix.col.sku': 'SKU',
    'matrix.col.product': 'Товар',
    'matrix.col.cat': 'Категория',
    'matrix.col.model': 'Модель',
    'matrix.col.power': 'Мощность',
    'matrix.col.length': 'Длина',
    'matrix.col.color': 'Цвет',
    'matrix.col.sup': 'Поставщик',
    'matrix.showing': 'Показано с',
    'matrix.to': 'по',
    'matrix.of': 'из',

    // SKU Constructor
    'sku.title': 'Конструктор SKU',
    'sku.subtitle': 'Создание новых SKU по стандартам кодирования GQbox',
    'sku.step1': 'Категория и Модель',
    'sku.step2': 'База SKU',
    'sku.step3': 'Характеристики',
    'sku.step4': 'Вариация',
    'sku.step5': 'Генерация',
    'sku.prev': 'Назад',
    'sku.next': 'Далее',
    'sku.reset': 'Сбросить',
    'sku.generate': 'Сгенерировать',

    // Dictionaries
    'dict.title': 'Менеджер справочников',
    'dict.subtitle': 'Управление нормализованными словарями и параметрами',
    'dict.add': 'Добавить запись',
    'dict.col.code': 'Код',
    'dict.col.source': 'Название (источник)',
    'dict.col.product': 'Название (товарное)',
    'dict.col.color': 'Цвет',
    'dict.col.products': 'Товары',
    'dict.col.actions': 'Действия',
    'dict.col.category': 'Категория',
    'dict.col.preview': 'Превью',
    'dict.col.type': 'Тип',
    'dict.col.description': 'Описание',
    'dict.form.source': 'Название (источник)',
    'dict.form.product': 'Название (товарное)',

    // Kit Builder
    'kit.title': 'Сборка комплектов',
    'kit.subtitle': 'Создание товарных бандлов и комбо-наборов',
    'kit.config': 'Конфигурация комплекта',
    'kit.nameEn': 'Название (EN)',
    'kit.nameRu': 'Название (RU)',
    'kit.components': 'Компоненты',
    'kit.addProduct': 'Добавить товар',
    'kit.preview': 'Предпросмотр комплекта',
    'kit.create': 'Создать комплект',

    // Media Manager
    'media.title': 'Медиа-менеджер',
    'media.subtitle': 'активов',
    'media.images': 'изображений',
    'media.videos': 'видео',
    'media.upload': 'Загрузить',
    'media.search': 'Поиск по имени файла или SKU...',
    'media.all': 'Все',
    'media.selected': 'выбрано',
    'media.clear': 'Сбросить',
    'media.col.file': 'Файл',
    'media.col.type': 'Тип',
    'media.col.sku': 'SKU',
    'media.col.size': 'Размер',
    'media.col.date': 'Дата',

    // AI Hub
    'ai.title': 'Ассистент AI',
    'ai.subtitle': 'Генерация описаний, перевод и автоматизация работы с контентом',
    'ai.quick': 'Быстрые действия',
    'ai.status': 'Статус AI',
    'ai.placeholder': 'Спросите AI сгенерировать контент, проанализировать SKU...',
  },
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.architecture': 'System Architecture',
    'nav.matrix': 'Product Matrix',
    'nav.sku-constructor': 'SKU Constructor',
    'nav.dictionary': 'Dictionaries',
    'nav.kit-builder': 'Kit Builder',
    'nav.media': 'Media Manager',
    'nav.ai-hub': 'AI Assistant',
    'nav.analysis': 'Analysis',
    'nav.beta': 'Beta',

    // Header & Layout
    'sidebar.tagline': 'Product System',
    'header.search': 'Search products...',
    'header.notifications': 'Notifications',
    'header.settings': 'Profile Settings',
    'header.team': 'Product Team',
    'header.admin': 'Administrator',

    // Dashboard
    'dash.title': 'Dashboard',
    'dash.items': 'Items',
    'dash.subtitle': 'Key metrics and statistics',
    'dash.updated': 'Last updated:',
    'dash.total': 'Total Products',
    'dash.active': 'Active SKUs',
    'dash.kits': 'Kit Products',
    'dash.categories': 'Categories',
    'dash.catDist': 'Products by Category',
    'dash.powerDist': 'Power Distribution',
    'dash.recent': 'Recent Products',
    'dash.viewAll': 'View all',
    'dash.supplierDist': 'Supplier Distribution',
    'dash.alerts': 'System Alerts',

    // Architecture
    'arch.title': 'System Architecture',
    'arch.subtitle': 'Deep analysis of product architecture, SKU logic, and database design',
    'arch.tab.overview': 'Overview',
    'arch.tab.sku': 'SKU Logic',
    'arch.tab.naming': 'Naming Logic',
    'arch.tab.schema': 'DB Schema',
    'arch.tab.system': 'System Design',
    'arch.summary.title': 'Architecture Analysis Summary',
    'arch.summary.entities': 'Entities',
    'arch.summary.relationships': 'Relationships',
    'arch.summary.categories': 'Categories',
    'arch.summary.sku_pattern': 'SKU Pattern',
    'arch.summary.name_templates': 'Name Templates',
    'arch.summary.validation_rules': 'Validation Rules',
    'arch.summary.normalized_tables': 'Normalized tables',
    'arch.summary.foreign_keys': 'Foreign key links',
    'arch.summary.product_types': 'Product types',
    'arch.summary.encoding_segments': 'Encoding segments',
    'arch.summary.auto_generation_rules': 'Auto-generation rules',
    'arch.summary.data_integrity': 'Data integrity',
    'arch.sku.title': 'SKU Generation Pattern',
    'arch.sku.rules_title': 'SKU Validation Rules',
    'arch.naming.title': 'Product Naming Pattern',
    'arch.naming.rules_title': 'Naming Rules by Category',
    'arch.schema.title': 'Entity Relationships',
    'arch.schema.relationships_title': 'Relationships',
    'arch.schema.close': 'Close',
    'arch.schema.fields': 'fields',
    'arch.system.frontend_title': 'Frontend Architecture',
    'arch.system.backend_title': 'Backend Architecture',
    'arch.system.ai_title': 'AI-Ready Knowledge Base Design',
    'arch.system.vector_embeddings': 'Vector Embeddings',
    'arch.system.structured_metadata': 'Structured Metadata',
    'arch.system.content_templates': 'Content Templates',
    'arch.system.attribute_graph': 'Attribute Graph',
    'arch.system.media_analysis': 'Media Analysis',
    'arch.system.multi_language': 'Multi-language',

    // Matrix
    'matrix.title': 'Product Matrix',
    'matrix.subtitle': 'products in catalog',
    'matrix.export': 'Export',
    'matrix.search': 'Search by SKU, name, model...',
    'matrix.filters': 'Filters',
    'matrix.clear': 'Clear all',
    'matrix.cat': 'Categories',
    'matrix.sup': 'Suppliers',
    'matrix.col.sku': 'SKU',
    'matrix.col.product': 'Product',
    'matrix.col.cat': 'Category',
    'matrix.col.model': 'Model',
    'matrix.col.power': 'Power',
    'matrix.col.length': 'Length',
    'matrix.col.color': 'Color',
    'matrix.col.sup': 'Supplier',
    'matrix.showing': 'Showing',
    'matrix.to': 'to',
    'matrix.of': 'of',

    // SKU Constructor
    'sku.title': 'SKU Constructor',
    'sku.subtitle': 'Build new product SKUs following the GQbox encoding system',
    'sku.step1': 'Category & Model',
    'sku.step2': 'SKU Base',
    'sku.step3': 'Attributes',
    'sku.step4': 'Variant',
    'sku.step5': 'Generate',
    'sku.prev': 'Previous',
    'sku.next': 'Next',
    'sku.reset': 'Reset',
    'sku.generate': 'Generate',

    // Dictionaries
    'dict.title': 'Dictionary Manager',
    'dict.subtitle': 'Manage reference data and encoding dictionaries',
    'dict.add': 'Add Entry',
    'dict.col.code': 'Code',
    'dict.col.source': 'Name (source)',
    'dict.col.product': 'Name (product)',
    'dict.col.color': 'Color',
    'dict.col.products': 'Products',
    'dict.col.actions': 'Actions',
    'dict.col.category': 'Category',
    'dict.col.preview': 'Preview',
    'dict.col.type': 'Type',
    'dict.col.description': 'Description',
    'dict.form.source': 'Name (source)',
    'dict.form.product': 'Name (product)',

    // Kit Builder
    'kit.title': 'Kit Builder',
    'kit.subtitle': 'Compose product bundles and combo sets',
    'kit.config': 'Kit Configuration',
    'kit.nameEn': 'Kit Name (EN)',
    'kit.nameRu': 'Kit Name (RU)',
    'kit.components': 'Components',
    'kit.addProduct': 'Add Product',
    'kit.preview': 'Kit Preview',
    'kit.create': 'Create Kit',

    // Media Manager
    'media.title': 'Media Manager',
    'media.subtitle': 'assets',
    'media.images': 'images',
    'media.videos': 'videos',
    'media.upload': 'Upload',
    'media.search': 'Search by filename or SKU...',
    'media.all': 'All',
    'media.selected': 'selected',
    'media.clear': 'Clear',
    'media.col.file': 'File',
    'media.col.type': 'Type',
    'media.col.sku': 'SKU',
    'media.col.size': 'Size',
    'media.col.date': 'Date',

    // AI Hub
    'ai.title': 'AI Assistant',
    'ai.subtitle': 'Generate content, analyze data, and automate product workflows',
    'ai.quick': 'Quick Actions',
    'ai.status': 'AI Status',
    'ai.placeholder': 'Ask AI to generate content, analyze SKUs, translate...',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Default language: Russian
  const [language, setLanguage] = useState<Language>('ru');

  const t = (key: string): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
