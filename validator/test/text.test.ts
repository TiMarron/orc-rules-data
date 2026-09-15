import { describe, it, expect } from 'vitest';
import { extractRefs, findUnknownTokens, walkStrings } from '../src/text.js';

describe('text helpers', () => {
  it('extracts [[id|label]] and [[id]] references', () => {
    expect(extractRefs('You are [[condition.frightened|frightened 1]] and [[condition.off-guard]].'))
      .toEqual(['condition.frightened', 'condition.off-guard']);
  });

  it('accepts the five action tokens and reports anything else in braces', () => {
    expect(findUnknownTokens('{1a} {2a} {3a} {r} {f}')).toEqual([]);
    expect(findUnknownTokens('Cast {2a} or {4a} or {rx}')).toEqual(['{4a}', '{rx}']);
  });

  it('walks every string with a dotted path', () => {
    const seen: string[] = [];
    walkStrings({ a: 'x', b: ['y', { c: 'z' }] }, (s, path) => seen.push(`${path}=${s}`));
    expect(seen).toEqual(['a=x', 'b[0]=y', 'b[1].c=z']);
  });
});
