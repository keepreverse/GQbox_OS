import type { ReactNode } from 'react';

export type ColumnAlign = 'left' | 'right' | 'center';
export type ColumnHideBelow = 'sm' | 'md' | 'lg';

export interface Column<T> {
  key: string;
  header: ReactNode;
  width: number;
  align?: ColumnAlign;
  nowrap?: boolean;
  hideBelow?: ColumnHideBelow;
  cell: (row: T, index: number) => ReactNode;
}

export interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  minWidth?: number;
  emptyMessage?: ReactNode;
  rowClassName?: string | ((row: T, index: number) => string);
  onRowClick?: (row: T) => void;
  bodyClassName?: string;
}

export function validateColumnWidths<T>(columns: Column<T>[]): number {
  const total = columns.reduce((sum, c) => sum + c.width, 0);
  if (process.env.NODE_ENV !== 'production' && Math.abs(total - 100) > 0.01) {
    console.warn(
      `[ResponsiveTable] Column widths sum to ${total}, expected 100. Columns:`,
      columns.map((c) => `${c.key}=${c.width}`).join(', ')
    );
  }
  return total;
}
