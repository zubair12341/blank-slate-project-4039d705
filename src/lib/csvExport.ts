/**
 * Convert array of objects to CSV string
 */
export function convertToCSV<T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T | string; header: string; formatter?: (value: any, row: T) => string }[]
): string {
  if (data.length === 0) return '';

  // Headers
  const headers = columns.map((col) => `"${col.header}"`).join(',');

  // Rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        const value = col.key.toString().includes('.')
          ? col.key.toString().split('.').reduce((obj: any, key) => obj?.[key], row)
          : row[col.key as keyof T];
        
        const formatted = col.formatter ? col.formatter(value, row) : value;
        
        // Escape quotes and wrap in quotes
        if (formatted === null || formatted === undefined) return '""';
        const stringValue = String(formatted);
        return `"${stringValue.replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data to CSV and trigger download
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T | string; header: string; formatter?: (value: any, row: T) => string }[],
  filename: string
): void {
  const csv = convertToCSV(data, columns);
  downloadCSV(csv, filename);
}
