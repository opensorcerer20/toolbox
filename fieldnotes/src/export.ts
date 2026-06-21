import type { Collection, Entry } from './types';

function escapeCSV(value: string | number | null): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function downloadCSV(collection: Collection, entries: Entry[]): void {
  const header = collection.fields.map(f => escapeCSV(f.name)).join(',');
  const rows = entries.map(e =>
    collection.fields.map(f => escapeCSV(e.data[f.id] ?? null)).join(',')
  );
  const csv = [header, ...rows].join('\r\n');
  download(csv, `${collection.name}.csv`, 'text/csv');
}

export function downloadJSON(collection: Collection, entries: Entry[]): void {
  const records = entries.map(e => {
    const obj: Record<string, unknown> = { _id: e.id, _createdAt: e.createdAt };
    for (const field of collection.fields) {
      obj[field.name] = e.data[field.id] ?? null;
    }
    return obj;
  });
  download(JSON.stringify(records, null, 2), `${collection.name}.json`, 'application/json');
}

function download(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
