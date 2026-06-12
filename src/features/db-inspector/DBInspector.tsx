import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Database,
  Play,
  Loader2,
  Table2,
  Code2,
  RefreshCw,
  ChevronRight,
  LayoutList,
  HardDrive,
  ImageOff,
  Image,
  PackageX,
  Unlink,
} from 'lucide-react';
import { useLanguage } from '@context/LanguageContext';
import { useDataSourceAPI } from '@api/dataSourceContext';
import { useDevMode } from '@context/DevModeContext';
import { Toast } from '@components/ui/Toast';
import { useToast } from '@hooks/useToast';
import DataTable from '@components/ui/DataTable';
import EmptyState from '@components/ui/EmptyState';
import ErrorAlert from '@components/ui/ErrorAlert';
import type { InspectorTableInfo, InspectorQueryResult } from '@api/dataSource';

type Tab = 'tables' | 'query';

interface QueryPreset {
  key: string;
  sql: string;
  icon: React.ElementType;
  label: string;
  description: string;
}

export default function DBInspector() {
  const { t } = useLanguage();
  const ds = useDataSourceAPI();
  const { devMode } = useDevMode();
  const { toast, showToast, hideToast } = useToast();
  const [tab, setTab] = useState<Tab>('tables');
  const [tables, setTables] = useState<InspectorTableInfo[] | null>(null);
  const [loadingTables, setLoadingTables] = useState(false);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [dump, setDump] = useState<InspectorQueryResult | null>(null);
  const [loadingDump, setLoadingDump] = useState(false);
  const [dumpError, setDumpError] = useState<string | null>(null);

  const [sql, setSql] = useState('SELECT * FROM products LIMIT 50;');
  const [running, setRunning] = useState(false);
  const [queryResult, setQueryResult] = useState<InspectorQueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const presets: QueryPreset[] = useMemo(
    () => [
      {
        key: 'tables',
        icon: LayoutList,
        label: t('inspector.query.preset.tables'),
        description: t('inspector.query.preset.tables.desc'),
        sql: `SELECT relname AS table_name,\n       n_live_tup AS row_estimate,\n       pg_size_pretty(pg_total_relation_size(relid)) AS size\nFROM pg_stat_user_tables\nORDER BY pg_total_relation_size(relid) DESC;`,
      },
      {
        key: 'sizes',
        icon: HardDrive,
        label: t('inspector.query.preset.sizes'),
        description: t('inspector.query.preset.sizes.desc'),
        sql: `SELECT relname AS table_name,\n       pg_size_pretty(pg_total_relation_size(relid)) AS total,\n       pg_size_pretty(pg_relation_size(relid)) AS data,\n       pg_size_pretty(pg_indexes_size(relid)) AS indexes\nFROM pg_stat_user_tables\nORDER BY pg_total_relation_size(relid) DESC;`,
      },
      {
        key: 'no_media',
        icon: ImageOff,
        label: t('inspector.query.preset.no_media'),
        description: t('inspector.query.preset.no_media.desc'),
        sql: `SELECT p.id, p.sku, p.product_name, p.category_id\nFROM products p\nLEFT JOIN product_media m ON m.variant_id = p.id\nWHERE m.id IS NULL\nORDER BY p.sku;`,
      },
      {
        key: 'no_primary',
        icon: Image,
        label: t('inspector.query.preset.no_primary'),
        description: t('inspector.query.preset.no_primary.desc'),
        sql: `SELECT p.id, p.sku, p.product_name\nFROM products p\nWHERE NOT EXISTS (\n  SELECT 1 FROM product_media m\n  WHERE m.variant_id = p.id AND m.is_primary = TRUE\n)\nORDER BY p.sku;`,
      },
      {
        key: 'kit_empty',
        icon: PackageX,
        label: t('inspector.query.preset.kit_empty'),
        description: t('inspector.query.preset.kit_empty.desc'),
        sql: `SELECT p.id, p.sku, p.product_name\nFROM products p\nWHERE p.is_kit = TRUE\n  AND NOT EXISTS (SELECT 1 FROM kit_components kc WHERE kc.kit_id = p.id);`,
      },
      {
        key: 'fk_orphans',
        icon: Unlink,
        label: t('inspector.query.preset.fk_orphans'),
        description: t('inspector.query.preset.fk_orphans.desc'),
        sql: `SELECT p.id, p.sku, p.category_id\nFROM products p\nWHERE p.category_id IS NOT NULL\n  AND NOT EXISTS (SELECT 1 FROM dictionaries d WHERE d.id = p.category_id);`,
      },
    ],
    [t]
  );

  const refreshTables = useCallback(async () => {
    if (!ds.inspector.available) return;
    setLoadingTables(true);
    setTablesError(null);
    try {
      const list = await ds.inspector.listTables();
      setTables(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTablesError(msg);
    } finally {
      setLoadingTables(false);
    }
  }, [ds]);

  useEffect(() => {
    if (tab === 'tables' && devMode && ds.inspector.available && tables === null) {
      void refreshTables();
    }
  }, [tab, devMode, ds, refreshTables, tables]);

  const openTable = useCallback(
    async (name: string) => {
      setSelectedTable(name);
      setDump(null);
      setDumpError(null);
      setLoadingDump(true);
      try {
        const res = await ds.inspector.dumpTable(name);
        setDump(res);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setDumpError(msg);
      } finally {
        setLoadingDump(false);
      }
    },
    [ds]
  );

  const runSql = useCallback(async () => {
    setRunning(true);
    setQueryError(null);
    setQueryResult(null);
    try {
      const res = await ds.inspector.runQuery(sql);
      setQueryResult(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      let displayMsg = msg;
      if (/forbidden/i.test(msg) || /only select/i.test(msg)) {
        displayMsg = t('inspector.error.readonly');
      } else if (/timeout/i.test(msg)) {
        displayMsg = t('inspector.error.timeout');
      } else {
        displayMsg = t('inspector.error.generic', { message: msg });
      }
      setQueryError(displayMsg);
      showToast(displayMsg, 'error');
    } finally {
      setRunning(false);
    }
  }, [ds, sql, t, showToast]);

  const applyPreset = useCallback(
    (preset: QueryPreset) => {
      setSql(preset.sql);
      setTab('query');
    },
    []
  );

  if (!devMode || !ds.inspector.available) {
    return (
      <div className="space-y-6">
        <Toast data={toast} onClose={hideToast} />
        <div className="flex items-start sm:items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-semibold text-gradient">
              {t('inspector.title')}
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary mt-0.5 sm:mt-1">
              {t('inspector.subtitle')}
            </p>
          </div>
        </div>
        <div className="glass rounded-xl p-8 flex flex-col items-center gap-3 text-center">
          <Database className="w-10 h-10 text-text-muted" />
          <p className="text-sm text-text-secondary">{t('inspector.dev_only')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Toast data={toast} onClose={hideToast} />

      {/* Header */}
      <div className="flex items-start sm:items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-semibold text-gradient flex items-center gap-2">
            <Database className="w-5 h-5 sm:w-6 sm:h-6 text-accent flex-shrink-0" />
            {t('inspector.title')}
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5 sm:mt-1">
            {t('inspector.subtitle')}
          </p>
        </div>
        <button
          onClick={() => {
            if (tab === 'tables') void refreshTables();
            else void runSql();
          }}
          className="flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg bg-accent/25 text-white text-xs hover:bg-accent/35 transition-[colors,opacity,transform,box-shadow] cursor-pointer font-medium border border-accent/40"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-0.5 rounded-xl bg-bg-secondary border border-border-subtle w-fit">
        <button
          onClick={() => setTab('tables')}
          className={`h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
            tab === 'tables'
              ? 'bg-accent/25 text-white border border-accent/40'
              : 'text-text-tertiary hover:bg-bg-hover hover:text-text-primary border border-transparent'
          }`}
        >
          <Table2 className="w-3.5 h-3.5" /> {t('inspector.tab.tables')}
        </button>
        <button
          onClick={() => setTab('query')}
          className={`h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
            tab === 'query'
              ? 'bg-accent/25 text-white border border-accent/40'
              : 'text-text-tertiary hover:bg-bg-hover hover:text-text-primary border border-transparent'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" /> {t('inspector.tab.query')}
        </button>
      </div>

      {/* Tables View */}
      {tab === 'tables' && (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          {/* Table List */}
          <div className="glass rounded-xl p-3 space-y-3 lg:max-h-[calc(100dvh-200px)] lg:overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                {t('inspector.tables.title')}
              </h3>
              {loadingTables && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-text-tertiary" />
              )}
            </div>

            {tablesError && <ErrorAlert message={tablesError} />}

            {tables === null && !loadingTables && !tablesError && (
              <div className="py-8 text-center text-xs text-text-tertiary">—</div>
            )}

            {tables && tables.length === 0 && (
              <div className="py-8 text-center text-xs text-text-tertiary">
                {t('inspector.dump.empty')}
              </div>
            )}

            {tables && tables.length > 0 && (
              <div className="space-y-1.5">
                {tables.map((tbl) => {
                  const isActive = selectedTable === tbl.name;
                  return (
                    <button
                      key={tbl.name}
                      onClick={() => void openTable(tbl.name)}
                      className={`w-full text-left group rounded-xl border transition-[colors,opacity,transform,box-shadow] cursor-pointer ${
                        isActive
                          ? 'bg-accent/15 border-accent/30'
                          : 'bg-bg-tertiary border-border-subtle hover:border-border-strong hover:bg-bg-hover'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isActive
                                ? 'bg-accent/20 text-accent'
                                : 'bg-bg-secondary text-text-tertiary group-hover:text-text-secondary'
                            }`}
                          >
                            <Table2 className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span
                              className={`text-xs font-mono font-medium truncate ${
                                isActive ? 'text-white' : 'text-text-primary'
                              }`}
                            >
                              {tbl.name}
                            </span>
                            <span className="text-[10px] text-text-tertiary tabular-nums">
                              {tbl.totalSize} · {tbl.columns.length}{' '}
                              {t('inspector.tables.col.columns')}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full tabular-nums flex-shrink-0 ${
                            isActive ? 'bg-accent/20 text-accent' : 'bg-bg-secondary text-text-tertiary'
                          }`}
                        >
                          ~{tbl.rowEstimate.toLocaleString()}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Table Detail */}
          <div className="glass rounded-xl p-3 lg:max-h-[calc(100dvh-200px)] lg:overflow-y-auto relative min-h-[300px]">
            {!selectedTable && (
              <EmptyState
                title={t('inspector.tables.empty_title')}
                description={t('inspector.tables.empty_desc')}
              />
            )}
            {selectedTable && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-sm font-mono text-text-primary truncate flex-1">
                    {t('inspector.dump.title')}:{' '}
                    <span className="text-accent">{selectedTable}</span>
                  </h3>
                </div>
                {loadingDump && (
                  <div className="py-12 flex items-center justify-center gap-2 text-xs text-text-tertiary">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('inspector.dump.loading')}
                  </div>
                )}
                {dumpError && <ErrorAlert message={dumpError} />}
                {dump && !loadingDump && !dumpError && (
                  <DataTable
                    result={dump}
                    searchPlaceholder={t('inspector.filter_placeholder')}
                    rowCountLabel={t('inspector.tables.col.rows')}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SQL View */}
      {tab === 'query' && (
        <div className="space-y-4">
          {/* Presets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {presets.map((preset) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.key}
                  onClick={() => applyPreset(preset)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border-subtle bg-bg-tertiary hover:border-border-strong hover:bg-bg-hover transition-[colors,opacity,transform,box-shadow] cursor-pointer text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium text-text-primary">{preset.label}</span>
                    <span className="text-[10px] text-text-tertiary">{preset.description}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-text-muted flex-shrink-0 ml-auto" />
                </button>
              );
            })}
          </div>

          {/* Editor */}
          <div className="glass rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                {t('inspector.query.editor')}
              </h3>
              <button
                onClick={() => void runSql()}
                disabled={running}
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-accent/25 text-white text-xs hover:bg-accent/35 transition-[colors,opacity,transform,box-shadow] cursor-pointer font-medium border border-accent/40 disabled:opacity-50"
              >
                {running ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {t('inspector.query.run')}
              </button>
            </div>
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              spellCheck={false}
              rows={8}
              className="w-full font-mono text-xs leading-relaxed bg-bg-tertiary border border-border-subtle rounded-lg p-3 focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
              placeholder={t('inspector.query.placeholder')}
            />
            {queryError && <ErrorAlert message={queryError} />}
            {queryResult && (
              <DataTable
                result={queryResult}
                searchPlaceholder={t('inspector.filter_placeholder')}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
