import React, { useState } from 'react';
import { Table } from '../Table';
import { Button } from '../Button';

export interface ChartFigureProps {
  /** Accessible chart title (§242). */
  title: string;
  /** Textual summary of the takeaway, e.g. "Median projection reaches ₹5.32Cr…". */
  summary: string;
  children: React.ReactNode;
  /**
   * Tabular data behind the chart for the "View data table" toggle.
   * `headings` parallel `rows[i]` cells.
   */
  dataTable?: { headings: string[]; rows: React.ReactNode[][] };
  className?: string;
}

/**
 * Accessible chart wrapper (§115 + §242): every important chart gets an
 * accessible title, a textual summary, and a "View data table" toggle.
 */
export const ChartFigure = ({ title, summary, children, dataTable, className }: ChartFigureProps) => {
  const [showTable, setShowTable] = useState(false);

  return (
    <figure className={className} aria-label={title}>
      <figcaption className="sr-only">
        {title}. {summary}
      </figcaption>
      {children}
      <p className="mt-2 text-xs text-muted leading-relaxed">{summary}</p>
      {dataTable && (
        <div className="mt-2">
          <Button variant="ghost" size="sm" onClick={() => setShowTable((value) => !value)}>
            {showTable ? 'Hide data table' : 'View data table'}
          </Button>
          {showTable && (
            <div className="mt-2 overflow-x-auto rounded-xl border border-border">
              <Table>
                <Table.Head>
                  <tr>
                    {dataTable.headings.map((heading) => (
                      <Table.HeadCell key={heading}>{heading}</Table.HeadCell>
                    ))}
                  </tr>
                </Table.Head>
                <Table.Body>
                  {dataTable.rows.map((cells, index) => (
                    <Table.Row key={index}>
                      {cells.map((cell, cellIndex) => (
                        <Table.Cell key={cellIndex} className="tabular-nums">
                          {cell}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          )}
        </div>
      )}
    </figure>
  );
};
