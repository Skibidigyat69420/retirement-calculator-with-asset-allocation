import React from 'react';
import { cn } from '../../lib/utils';

const Head = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <thead className={cn('border-b border-border', className)}>{children}</thead>
);

const HeadCell = ({
  children,
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    {...props}
    scope="col"
    className={cn(
      'px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted whitespace-nowrap',
      className,
    )}
  >
    {children}
  </th>
);

const Body = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <tbody className={cn('divide-y divide-border', className)}>{children}</tbody>
);

const Row = ({ children, className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr {...props} className={cn('transition-colors duration-100 hover:bg-sunken/60', className)}>
    {children}
  </tr>
);

const Cell = ({ children, className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td {...props} className={cn('px-4 py-3 text-ink align-middle', className)}>
    {children}
  </td>
);

export interface TableComponent extends React.FC<React.TableHTMLAttributes<HTMLTableElement>> {
  Head: typeof Head;
  HeadCell: typeof HeadCell;
  Body: typeof Body;
  Row: typeof Row;
  Cell: typeof Cell;
}

/**
 * Styled table shell (desktop "rich table", §106). Compose with
 * `Table.Head` / `Table.Body` / `Table.Row` / `Table.Cell`.
 */
export const Table: TableComponent = ({ children, className, ...props }) => {
  return (
    <table {...props} className={cn('w-full text-sm border-collapse', className)}>
      {children}
    </table>
  );
};

Table.Head = Head;
Table.HeadCell = HeadCell;
Table.Body = Body;
Table.Row = Row;
Table.Cell = Cell;
