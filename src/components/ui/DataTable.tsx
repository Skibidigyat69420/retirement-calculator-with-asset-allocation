import { cn } from '../../lib/utils';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  className?: string;
  emptyMessage?: string;
  'aria-label'?: string;
}

export function DataTable<T>({ columns, data, className, emptyMessage = 'No data available', 'aria-label': ariaLabel }: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-10 text-stone-600 text-sm bg-stone-50 rounded-xl border border-stone-100">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)} role="region" aria-label={ariaLabel || 'Data table'} tabIndex={0}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-left text-[10px] uppercase tracking-wider text-stone-700">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'py-2 pr-4 font-semibold whitespace-nowrap',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {data.map((row, idx) => (
            <tr key={idx} className="hover:bg-stone-50/80 transition-colors">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'py-2.5 pr-4 whitespace-nowrap',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                  )}
                >
                  {col.render ? col.render(row) : String((row as Record<string, string | number>)[col.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
