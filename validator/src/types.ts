export const TYPE_FOLDERS: Record<string, string> = {
  trait: 'traits',
  condition: 'conditions',
  skill: 'skills',
  action: 'actions',
  feat: 'feats',
  feature: 'features',
  ancestry: 'ancestries',
  heritage: 'heritages',
  background: 'backgrounds',
  class: 'classes',
  spell: 'spells',
  school: 'schools',
  thesis: 'theses',
  item: 'items',
};
export const RECORD_TYPES = Object.keys(TYPE_FOLDERS);
export const ID_PATTERN = /^[a-z]+\.[a-z0-9]+(-[a-z0-9]+)*$/;

export interface SourceRef {
  book: string;
  page: number;
  revision: string;
}

export interface RecordEnvelope {
  id: string;
  type: string;
  name: string;
  text: string;
  traits: string[];
  rarity: string;
  source: SourceRef;
  review: string;
  edited: boolean;
  editNote?: string;
  [key: string]: unknown;
}

export interface RecordFile {
  /** path relative to repo root, forward slashes */
  path: string;
  /** folder under data/ */
  folder: string;
  record: RecordEnvelope;
}

export interface Book {
  id: string;
  title: string;
  pages: number;
  revisions: string[];
}

export interface Dataset {
  root: string;
  files: RecordFile[];
  byId: Map<string, RecordFile>;
  i18n: Record<string, string>;
  books: Book[];
}

export interface Issue {
  level: 'error' | 'warning';
  file: string;
  message: string;
}

export type Check = (ds: Dataset) => Issue[];
