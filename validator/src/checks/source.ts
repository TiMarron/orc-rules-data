import type { Check, Issue } from '../types.js';

export const sourceCheck: Check = (ds) => {
  const issues: Issue[] = [];
  const books = new Map(ds.books.map((b) => [b.id, b]));
  for (const f of ds.files) {
    const src = f.record.source;
    if (!src || typeof src !== 'object') continue;
    const book = books.get(src.book);
    if (!book) {
      issues.push({ level: 'error', file: f.path, message: `source.book "${src.book}" is not listed in books.json` });
      continue;
    }
    if (!Number.isInteger(src.page) || src.page < 1 || src.page > book.pages) {
      issues.push({ level: 'error', file: f.path, message: `source.page ${src.page} is outside 1..${book.pages} for ${book.id}` });
    }
    if (!book.revisions.includes(src.revision)) {
      issues.push({ level: 'error', file: f.path, message: `source.revision "${src.revision}" is not one of ${book.revisions.join(', ')} for ${book.id}` });
    }
  }
  return issues;
};
