import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import type { InspectorQueryResult } from '@api/dataSource';

function formatCell(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

interface DataTableProps {
  result: InspectorQueryResult;
  searchPlaceholder: string;
  rowCountLabel?: string;
}

export default function DataTable({ result, searchPlaceholder, rowCountLabel }: DataTableProps) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return result.rows;
    return result.rows.filter((r) =>
      result.columns.some((c) => {
        const v = r[c];
        return v != null && String(v).toLowerCase().includes(q);
      })
    );
  }, [result, search]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[10px] text-text-tertiary tabular-nums">
          {rowCountLabel && result.rowCount > 0
            ? `${result.rowCount} ${rowCountLabel}`
            : `${result.rowCount} rows`}
          {result.truncated && ' (truncated)'}
        </p>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-8 pl-8 pr-3 text-xs bg-bg-tertiary border border-border-subtle rounded-lg focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
          />
        </div>
      </div>

      {result.rows.length === 0 ? (
        <div className="py-12 text-center text-xs text-text-tertiary">—</div>
      ) : (
        <div className="overflow-auto max-h-[60vh] rounded-lg border border-border-subtle">
          <table className="text-[10px] sm:text-xs font-mono w-full border-collapse">
            <thead className="sticky top-0 bg-bg-secondary z-10">
              <tr>
                {result.columns.map((c) => (
                  <th
                    key={c}
                    className="text-left px-3 py-2 border-b border-border-subtle whitespace-nowrap text-text-tertiary font-medium"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/30">
              {filtered.map((row, i) => (
                <tr key={i} className="hover:bg-bg-hover/40 transition-colors">
                  {result.columns.map((c) => (
                    <td
                      key={c}
                      className="px-3 py-2 align-top max-w-[280px] break-words"
                      title={formatCell(row[c])}
                    >
                      {formatCell(row[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
