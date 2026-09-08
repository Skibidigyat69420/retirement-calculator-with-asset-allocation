import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Table } from './Table';
import { SkeletonTableRows } from './Skeleton';
import { EmptyState } from './EmptyState';

export type SortDirection = 'asc' | 'desc';

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  /** Cell renderer. */
  render: (row: T, index: number) => React.ReactNode;
  /** Enables client-side sorting (§244). Provide for server-side too. */
  sortAccessor?: (row: T) => string | number;
  /** Column classes, e.g. numeric right-alignment: "text-right". */
  className?: string;
  headClassName?: string;
  /** Columns marked primary lead the mobile stacked card (§106). */
  mobilePrimary?: boolean;
  /** sr-only-friendly label used on the mobile card if `header` is complex. */
  mobileLabel?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  /** Unique row key. */
  rowKey: (row: T, index: number) => React.Key;
  /** Initial sort column key + direction. */
  defaultSort?: { key: string; direction: SortDirection };
  /** Controlled sort (server-side sorting for large datasets, §244). */
  sort?: { key: string; direction: SortDirection } | null;
  onSortChange?: (sort: { key: string; direction: SortDirection } | null) => void;
  loading?: boolean;
  skeletonRows?: number;
  /** §117 empty state; defaults to a generic EmptyState with an action slot. */
  emptyState?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onRowClick?: (row: T) => void;
  /** Accessible table label. */
  label: string;
  className?: string;
}

function defaultCompare(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'en-IN', { numeric: true, sensitivity: 'base' });
}

/**
 * DataTable (§106 responsive tables + §244 sorting):
 *  - Desktop: rich table with sortable headers.
 *  - Mobile: rows collapse into stacked cards — no forced horizontal scroll.
 *  - Built-in loading skeleton rows and an empty-state slot.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  defaultSort,
  sort: controlledSort,
  onSortChange,
  loading = false,
  skeletonRows = 6,
  emptyState,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  onRowClick,
  label,
  className,
}: DataTableProps<T>) {
  const [internalSort, setInternalSort] = useState<{ key: string; direction: SortDirection } | null>(
    defaultSort ?? null,
  );
  const sort = controlledSort !== undefined ? controlledSort : internalSort;

  const toggleSort = (key: string) => {
    const next =
      sort?.key === key
        ? sort.direction === 'asc'
          ? { key, direction: 'desc' as SortDirection }
          : null
        : { key, direction: 'asc' as SortDirection };
    if (controlledSort === undefined) setInternalSort(next);
    onSortChange?.(next);
  };

  const sortedRows = useMemo(() => {
    if (!sort || controlledSort !== undefined) return rows;
    const column = columns.find((col) => col.key === sort.key);
    if (!column?.sortAccessor) return rows;
    const accessor = column.sortAccessor;
    return [...rows].sort((a, b) =>
      sort.direction === 'asc'
        ? defaultCompare(accessor(a), accessor(b))
        : defaultCompare(accessor(b), accessor(a)),
    );
  }, [rows, sort, columns, controlledSort]);

  const displayRows = controlledSort !== undefined ? rows : sortedRows;

  if (loading) {
    return (
      <div className={cn('rounded-2xl border border-border bg-surface overflow-hidden', className)} aria-busy="true">
        <SkeletonTableRows rows={skeletonRows} columns={Math.min(columns.length, 5)} />
      </div>
    );
  }

  if (displayRows.length === 0) {
    return (
      <div className={className}>
        {emptyState ?? (
          <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
        )}
      </div>
    );
  }

  const mobileColumns = columns.filter((col) => !col.mobileLabel || col.mobilePrimary);
  const primaryColumn = columns.find((col) => col.mobilePrimary) ?? columns[0];

  const sortButton = (column: DataTableColumn<T>) => {
    if (!column.sortAccessor && !onSortChange) return <span>{column.header}</span>;
    const active = sort?.key === column.key;
    return (
      <button
        type="button"
        onClick={() => toggleSort(column.key)}
        aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
        className={cn(
          'inline-flex items-center gap-1 uppercase tracking-wider hover:text-ink transition-colors cursor-pointer',
          active && 'text-accent',
        )}
      >
        {column.header}
        {active ? (
          sort.direction === 'asc' ? (
            <ArrowUp size={12} aria-hidden="true" />
          ) : (
            <ArrowDown size={12} aria-hidden="true" />
          )
        ) : (
          <ArrowUpDown size={12} aria-hidden="true" className="opacity-40" />
        )}
      </button>
    );
  };

  return (
    <>
      {/* Desktop / tablet: rich table */}
      <div className={cn('hidden md:block rounded-2xl border border-border bg-surface overflow-hidden', className)}>
        <Table aria-label={label}>
          <Table.Head>
            <tr>
              {columns.map((column) => (
                <Table.HeadCell key={column.key} className={cn('first:pl-5 last:pr-5', column.headClassName)}>
                  {sortButton(column)}
                </Table.HeadCell>
              ))}
            </tr>
          </Table.Head>
          <Table.Body>
            {displayRows.map((row, index) => (
              <Table.Row
                key={rowKey(row, index)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(onRowClick && 'cursor-pointer')}
              >
                {columns.map((column) => (
                  <Table.Cell key={column.key} className={cn('first:pl-5 last:pr-5', column.className)}>
                    {column.render(row, index)}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>

      {/* Mobile: stacked cards (§106) */}
      <ul className={cn('md:hidden space-y-2.5', className)} aria-label={label}>
        {displayRows.map((row, index) => (
          <li key={rowKey(row, index)}>
            <div
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              className={cn(
                'rounded-2xl border border-border bg-surface p-4 space-y-2',
                onRowClick && 'cursor-pointer active:scale-[0.99] transition-transform',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                {primaryColumn.render(row, index)}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t border-border">
                {mobileColumns
                  .filter((column) => column.key !== primaryColumn.key)
                  .map((column) => (
                    <div key={column.key} className="min-w-0">
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        {column.mobileLabel ?? (typeof column.header === 'string' ? column.header : column.key)}
                      </dt>
                      <dd className="text-sm text-ink truncate">{column.render(row, index)}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
