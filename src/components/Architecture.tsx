import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Database, Link2, Hash, Type, FileCode, Layers, ArrowRight,
  Box, GitBranch, Table, Key,
  Shield, Zap, Search, Server
} from 'lucide-react';
import { architectureNotes, skuLogic, namingLogic, entities, relationships, skuLogicEn, namingLogicEn, architectureNotesEn, entitiesEn } from '../data/architecture';
import { useLanguage } from '../context/LanguageContext';

export default function Architecture() {
  const { t, language } = useLanguage();
  const [expandedEntity, setExpandedEntity] = useState<string | null>('product_bases');
  const [activeTab, setActiveTab] = useState<'overview' | 'sku' | 'naming' | 'schema' | 'system'>('overview');

  // Используем русские или английские данные в зависимости от языка
  const currentSkuLogic = language === 'ru' ? skuLogic : skuLogicEn;
  const currentNamingLogic = language === 'ru' ? namingLogic : namingLogicEn;
  const currentArchitectureNotes = language === 'ru' ? architectureNotes : architectureNotesEn;
  const currentEntities = language === 'ru' ? entities : entitiesEn;

  const tabs = [
    { id: 'overview' as const, label: t('arch.tab.overview'), icon: Layers },
    { id: 'sku' as const, label: t('arch.tab.sku'), icon: Hash },
    { id: 'naming' as const, label: t('arch.tab.naming'), icon: Type },
    { id: 'schema' as const, label: t('arch.tab.schema'), icon: Database },
    { id: 'system' as const, label: t('arch.tab.system'), icon: Server },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-gradient">{t('arch.title')}</h2>
        <p className="text-xs sm:text-sm text-text-secondary mt-0.5 sm:mt-1">{t('arch.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-bg-secondary border border-border-subtle overflow-x-auto w-full">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex h-11 sm:h-10 min-w-[132px] items-center justify-center gap-2 px-3 rounded-lg text-xs sm:text-sm transition-all cursor-pointer flex-shrink-0 ${
              activeTab === tab.id
                ? 'bg-bg-elevated text-text-primary shadow-sm font-medium'
                : 'text-text-tertiary hover:bg-bg-hover hover:text-text-secondary'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span className="truncate">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="glass rounded-xl p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 flex items-center gap-2">
              <Layers className="w-4 sm:w-5 h-4 sm:h-5 text-accent" />
              {t('arch.summary.title')}
            </h3>
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-text-secondary leading-relaxed text-xs sm:text-sm">
                {currentArchitectureNotes}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: Database, label: t('arch.summary.entities'), value: currentEntities.length, desc: t('arch.summary.normalized_tables') },
              { icon: Link2, label: t('arch.summary.relationships'), value: relationships.length, desc: t('arch.summary.foreign_keys') },
              { icon: Box, label: t('arch.summary.categories'), value: '12', desc: t('arch.summary.product_types') },
              { icon: Hash, label: t('arch.summary.sku_pattern'), value: '6', desc: t('arch.summary.encoding_segments') },
              { icon: Type, label: t('arch.summary.name_templates'), value: '10', desc: t('arch.summary.auto_generation_rules') },
              { icon: Shield, label: t('arch.summary.validation_rules'), value: '8', desc: t('arch.summary.data_integrity') },
            ].map((item) => (
                <div
                  key={item.label}
                  className="glass rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4 min-h-[44px] sm:min-h-0"
                >
                  <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg bg-bg-tertiary border border-border-default flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 sm:w-5 h-4 sm:h-5 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-xl font-bold">{item.value}</p>
                    <p className="text-[11px] sm:text-xs text-text-tertiary truncate">{item.label}</p>
                    <p className="text-[9px] sm:text-[10px] text-text-muted truncate">{item.desc}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* SKU Logic Tab */}
      {activeTab === 'sku' && (
        <div className="space-y-6">
          <div className="glass rounded-xl p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-medium mb-2 flex items-center gap-2">
              <Hash className="w-4 sm:w-5 h-4 sm:h-5 text-accent" />
              {t('arch.sku.title')}
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary mb-3 sm:mb-4">{currentSkuLogic.pattern}</p>
            
            <div className="space-y-3">
              {currentSkuLogic.segments.map((seg) => (
                <div
                  key={seg.code}
                  className="flex flex-col sm:flex-row gap-2 sm:gap-4 p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle"
                >
                  <code className="text-accent text-sm sm:min-w-[120px]">{seg.code}</code>
                  <div className="flex-1">
                    <p className="text-sm text-text-primary">{seg.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {seg.examples.map((ex) => (
                        <span key={ex} className="text-[11px] px-2 py-0.5 rounded bg-bg-elevated text-text-secondary border border-border-subtle">
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-xl p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 flex items-center gap-2">
              <Shield className="w-4 sm:w-5 h-4 sm:h-5 text-success" />
              {t('arch.sku.rules_title')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentSkuLogic.rules.map((rule, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-bg-tertiary/30">
                  <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] text-success font-bold">{i + 1}</span>
                  </div>
                  <p className="text-sm text-text-secondary">{rule}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Naming Logic Tab */}
      {activeTab === 'naming' && (
        <div className="space-y-6">
          <div className="glass rounded-xl p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-medium mb-2 flex items-center gap-2">
              <Type className="w-4 sm:w-5 h-4 sm:h-5 text-accent" />
              {t('arch.naming.title')}
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary mb-3 sm:mb-4">{currentNamingLogic.pattern}</p>
            
            <div className="space-y-3">
              {currentNamingLogic.segments.map((seg) => (
                <div
                  key={seg.code}
                  className="flex flex-col sm:flex-row gap-2 sm:gap-4 p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle"
                >
                  <code className="text-accent text-sm sm:min-w-[100px]">{seg.code}</code>
                  <div className="flex-1">
                    <p className="text-sm text-text-primary">{seg.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {seg.examples.map((ex) => (
                        <span key={ex} className="text-[11px] px-2 py-0.5 rounded bg-bg-elevated text-text-secondary border border-border-subtle">
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-xl p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 flex items-center gap-2">
              <FileCode className="w-4 sm:w-5 h-4 sm:h-5 text-warning" />
              {t('arch.naming.rules_title')}
            </h3>
            <div className="space-y-2">
              {currentNamingLogic.rules.map((rule, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-bg-tertiary/30">
                  <div className="w-5 h-5 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] text-warning font-bold">{i + 1}</span>
                  </div>
                  <p className="text-sm text-text-secondary">{rule}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DB Schema Tab */}
      {activeTab === 'schema' && (
        <div className="space-y-6">
          {/* ER Diagram Visualization */}
          <div className="glass rounded-xl p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 flex items-center gap-2">
              <GitBranch className="w-4 sm:w-5 h-4 sm:h-5 text-accent" />
              {t('arch.schema.title')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {currentEntities.map((entity) => (
                <motion.div
                  key={entity.name}
                  whileHover={{ scale: 1.02 }}
                  className={`min-h-[44px] sm:min-h-0 p-3 rounded-lg border cursor-pointer transition-all ${
                    expandedEntity === entity.name
                      ? 'border-accent/50 bg-accent/15'
                      : 'border-border-subtle bg-bg-tertiary/50 hover:border-border-default'
                  }`}
                  onClick={() => setExpandedEntity(expandedEntity === entity.name ? null : entity.name)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Table className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                    <span className="text-xs font-medium truncate">{entity.name}</span>
                  </div>
                  <p className="text-[10px] text-text-tertiary">{entity.fields.length} {t('arch.schema.fields')}</p>
                </motion.div>
              ))}
            </div>

            {/* Relationship Lines */}
            <div className="mt-6 p-4 rounded-lg bg-bg-tertiary/30 border border-border-subtle overflow-x-auto">
              <h4 className="text-xs font-medium text-text-secondary mb-3">
                {t('arch.schema.relationships_title')}
              </h4>
              <div className="space-y-2 min-w-[450px] sm:min-w-[600px]">
                {relationships.map((rel, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-accent">{rel.from}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated text-text-secondary border border-border-subtle">{rel.type}</span>
                      <ArrowRight className="w-3 h-3 text-text-muted" />
                    </div>
                    <span className="text-accent">{rel.to}</span>
                    <span className="text-xs text-text-tertiary">— {rel.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Expanded Entity Detail */}
          <div
            style={{
              display: 'grid',
              gridTemplateRows: expandedEntity ? '1fr' : '0fr',
              transition: 'grid-template-rows 0.25s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease',
              opacity: expandedEntity ? 1 : 0,
            }}
          >
            <div className="overflow-hidden">
              <div className="glass rounded-xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-medium flex items-center gap-2">
                    <Database className="w-4 sm:w-5 h-4 sm:h-5 text-accent" />
                    {expandedEntity}
                  </h3>
                  <button
                    onClick={() => setExpandedEntity(null)}
                    className="h-11 sm:h-9 px-3 rounded-lg text-xs text-text-tertiary hover:bg-bg-hover hover:text-text-primary cursor-pointer"
                  >
                    {t('arch.schema.close')}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <div className="min-w-[350px] sm:min-w-[500px]">
                    {currentEntities.find(e => e.name === expandedEntity)?.fields.map((field) => (
                      <div key={field.name} className="flex items-center gap-4 py-2 border-b border-border-subtle last:border-0">
                        <div className="flex items-center gap-2 w-48 flex-shrink-0">
                          <Key className={`w-3 h-3 ${field.name === 'id' ? 'text-warning' : 'text-text-muted'}`} />
                          <span className="text-sm">{field.name}</span>
                        </div>
                        <code className="text-xs px-2 py-0.5 rounded bg-bg-elevated text-text-secondary border border-border-subtle w-32 flex-shrink-0">
                          {field.type}
                        </code>
                        <span className="text-xs text-text-tertiary">{field.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Design Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass rounded-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 flex items-center gap-2">
                <Zap className="w-4 sm:w-5 h-4 sm:h-5 text-accent" />
                {t('arch.system.frontend_title')}
              </h3>
              <div className="space-y-3 text-sm text-text-secondary">
                <div className="p-3 rounded-lg bg-bg-tertiary/50">
                  <p className="font-medium text-text-primary mb-1">Next.js 15 App Router</p>
                  <p className="text-xs">{t('arch.system.fe_nextjs_desc')}</p>
                </div>
                <div className="p-3 rounded-lg bg-bg-tertiary/50">
                  <p className="font-medium text-text-primary mb-1">shadcn/ui + Tailwind CSS</p>
                  <p className="text-xs">{t('arch.system.fe_shadcn_desc')}</p>
                </div>
                <div className="p-3 rounded-lg bg-bg-tertiary/50">
                  <p className="font-medium text-text-primary mb-1">TanStack Query</p>
                  <p className="text-xs">{t('arch.system.fe_tanstack_desc')}</p>
                </div>
                <div className="p-3 rounded-lg bg-bg-tertiary/50">
                  <p className="font-medium text-text-primary mb-1">Zustand</p>
                  <p className="text-xs">{t('arch.system.fe_zustand_desc')}</p>
                </div>
              </div>
            </div>

            <div className="glass rounded-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 flex items-center gap-2">
                <Server className="w-4 sm:w-5 h-4 sm:h-5 text-success" />
                {t('arch.system.backend_title')}
              </h3>
              <div className="space-y-3 text-sm text-text-secondary">
                <div className="p-3 rounded-lg bg-bg-tertiary/50">
                  <p className="font-medium text-text-primary mb-1">Supabase + PostgreSQL</p>
                  <p className="text-xs">{t('arch.system.be_supabase_desc')}</p>
                </div>
                <div className="p-3 rounded-lg bg-bg-tertiary/50">
                  <p className="font-medium text-text-primary mb-1">Database Functions</p>
                  <p className="text-xs">{t('arch.system.be_db_functions_desc')}</p>
                </div>
                <div className="p-3 rounded-lg bg-bg-tertiary/50">
                  <p className="font-medium text-text-primary mb-1">Edge Functions</p>
                  <p className="text-xs">{t('arch.system.be_edge_functions_desc')}</p>
                </div>
                <div className="p-3 rounded-lg bg-bg-tertiary/50">
                  <p className="font-medium text-text-primary mb-1">Storage Buckets</p>
                  <p className="text-xs">{t('arch.system.be_storage_desc')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 flex items-center gap-2">
              <Search className="w-4 sm:w-5 h-4 sm:h-5 text-warning" />
              {t('arch.system.ai_title')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { title: t('arch.system.vector_embeddings'), desc: t('arch.system.ai_vector_desc'), icon: Database },
                { title: t('arch.system.structured_metadata'), desc: t('arch.system.ai_metadata_desc'), icon: FileCode },
                { title: t('arch.system.content_templates'), desc: t('arch.system.ai_templates_desc'), icon: Type },
                { title: t('arch.system.attribute_graph'), desc: t('arch.system.ai_graph_desc'), icon: GitBranch },
                { title: t('arch.system.media_analysis'), desc: t('arch.system.ai_media_desc'), icon: Search },
                { title: t('arch.system.multi_language'), desc: t('arch.system.ai_i18n_desc'), icon: Layers },
              ].map((item) => (
                <div
                  key={item.title}
                  className="p-4 rounded-lg bg-bg-tertiary/50 border border-border-subtle"
                >
                  <item.icon className="w-5 h-5 text-accent mb-2" />
                  <p className="text-sm font-medium text-text-primary">{item.title}</p>
                  <p className="text-xs text-text-tertiary mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
