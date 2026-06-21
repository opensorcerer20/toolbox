export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select';

export interface Field {
  id: string;
  name: string;
  type: FieldType;
  options?: string[]; // only for 'select'
}

export interface Collection {
  id: string;
  name: string;
  fields: Field[];
  createdAt: string; // ISO string
}

export interface Entry {
  id: string;
  collectionId: string;
  data: Record<string, string | number | null>;
  createdAt: string; // ISO string
}
