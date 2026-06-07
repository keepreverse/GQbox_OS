import type { Column, ResponsiveTableProps } from '@app-types/table';
import { validateColumnWidths } from '@app-types/table';

const ALIGN_CLASS: Record<string, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

const HIDE_BELOW_CELL_CLASS: Record<string, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
};

const HIDE_BELOW_COL_CLASS: Record<string, string> = {
  sm: 'hidden sm:table-column',
  md: 'hidden md:table-column',
  lg: 'hidden lg:table-column',
};

function HeaderCell<T>({ col }: { col: Column<T> }) {
  const align = col.align ?? 'left';
  const hide = col.hideBelow ? HIDE_BELOW_CELL_CLASS[col.hideBelow] : '';
  return (
    <th
      style={{ width: `${col.width}%` }}
      className={`${ALIGN_CLASS[align]} px-2 sm:px-3 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-tertiary uppercase tracking-wide ${col.nowrap ? 'whitespace-nowrap' : ''} ${hide}`}
    >
      <div className="truncate">{col.header}</div>
    </th>
  );
}

function BodyCell<T>({ col, row, index }: { col: Column<T>; row: T; index: number }) {
  const align = col.align ?? 'left';
  const hide = col.hideBelow ? HIDE_BELOW_CELL_CLASS[col.hideBelow] : '';
  return (
    <td
      className={`${ALIGN_CLASS[align]} px-2 sm:px-3 py-2 sm:py-3 ${col.nowrap ? 'whitespace-nowrap' : ''} ${hide}`}
    >
      <div className="overflow-hidden min-w-0">{col.cell(row, index)}</div>
    </td>
  );
}

export function ResponsiveTable<T>({
  columns,
  rows,
  rowKey,
  minWidth = 640,
  emptyMessage,
  rowClassName,
  onRowClick,
  bodyClassName,
}: ResponsiveTableProps<T>) {
  validateColumnWidths(columns);
  const table = (
    <table className="w-full text-sm table-fixed">
      <colgroup>
        {columns.map((c) => {
          const hide = c.hideBelow ? HIDE_BELOW_COL_CLASS[c.hideBelow] : '';
          return <col key={c.key} style={{ width: `${c.width}%` }} className={hide} />;
        })}
      </colgroup>
      <thead>
        <tr className="border-b border-border-subtle">
          {columns.map((c) => (
            <HeaderCell key={c.key} col={c} />
          ))}
        </tr>
      </thead>
      <tbody className={bodyClassName}>
        {rows.map((row, i) => {
          const extra =
            typeof rowClassName === 'function' ? rowClassName(row, i) : (rowClassName ?? '');
          return (
            <tr
              key={rowKey(row)}
              className={`border-b border-border-subtle/50 ${extra}`}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((c) => (
                <BodyCell key={c.key} col={c} row={row} index={i} />
              ))}
            </tr>
          );
        })}
        {rows.length === 0 && emptyMessage !== undefined && (
          <tr>
            <td
              colSpan={columns.length}
              className="px-3 sm:px-4 py-10 text-center text-xs text-text-tertiary"
            >
              {emptyMessage}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth }} className="inline-block min-w-full align-top">
        {table}
      </div>
    </div>
  );
}

export default ResponsiveTable;
