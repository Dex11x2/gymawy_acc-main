import React from 'react';

// Table Container
export interface TableProps {
  children: React.ReactNode;
  className?: string;
}

const Table: React.FC<TableProps> & {
  Header: React.FC<TableSectionProps>;
  Body: React.FC<TableSectionProps>;
  Row: React.FC<TableRowProps>;
  Head: React.FC<TableCellProps>;
  Cell: React.FC<TableCellProps>;
} = ({ children, className = '' }) => {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-brand-50 dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          {children}
        </table>
      </div>
    </div>
  );
};

// Table Section Props (Header, Body)
interface TableSectionProps {
  children: React.ReactNode;
  className?: string;
}

// Table Header
const TableHeader: React.FC<TableSectionProps> = ({ children, className = '' }) => {
  return (
    <thead className={`bg-gray-50 dark:bg-gray-800/50 ${className}`}>
      {children}
    </thead>
  );
};

// Table Body
const TableBody: React.FC<TableSectionProps> = ({ children, className = '' }) => {
  return (
    <tbody className={`divide-y divide-gray-100 dark:divide-gray-800 ${className}`}>
      {children}
    </tbody>
  );
};

// Table Row
interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

const TableRow: React.FC<TableRowProps> = ({
  children,
  className = '',
  onClick,
  hover = true,
}) => {
  return (
    <tr
      onClick={onClick}
      className={`
        ${hover ? 'hover:bg-gray-50 dark:hover:bg-white/[0.02]' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        transition-colors duration-150
        ${className}
      `}
    >
      {children}
    </tr>
  );
};

// Table Cell Props
interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  colSpan?: number;
}

// Table Head Cell
const TableHead: React.FC<TableCellProps> = ({
  children,
  className = '',
  align = 'right',
  width,
}) => {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <th
      className={`
        px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400
        ${alignClasses[align]}
        ${className}
      `}
      style={width ? { width } : undefined}
    >
      {children}
    </th>
  );
};

// Table Data Cell
const TableCell: React.FC<TableCellProps> = ({
  children,
  className = '',
  align = 'right',
  width,
  colSpan,
}) => {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <td
      className={`
        whitespace-nowrap px-6 py-4 text-sm text-gray-800 dark:text-white/90
        ${alignClasses[align]}
        ${className}
      `}
      style={width ? { width } : undefined}
      colSpan={colSpan}
    >
      {children}
    </td>
  );
};

// Attach sub-components
Table.Header = TableHeader;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Head = TableHead;
Table.Cell = TableCell;

export default Table;
