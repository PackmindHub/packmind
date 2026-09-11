import { splitScopeGlobs, unmatchableScopeGlobs } from './scopeGlobs';

describe('splitScopeGlobs', () => {
  it('splits on commas', () => {
    expect(splitScopeGlobs('src/**/*.ts, apps/**/*.tsx')).toEqual([
      'src/**/*.ts',
      'apps/**/*.tsx',
    ]);
  });

  it('keeps a brace group whole, commas and all', () => {
    expect(splitScopeGlobs('src/**/*.{ts,tsx}, docs/**')).toEqual([
      'src/**/*.{ts,tsx}',
      'docs/**',
    ]);
  });

  it('drops the empty parts of a trailing or doubled comma', () => {
    expect(splitScopeGlobs('src/**,, ')).toEqual(['src/**']);
  });
});

describe('unmatchableScopeGlobs', () => {
  it('reports nothing on a scope of patterns', () => {
    expect(unmatchableScopeGlobs('src/**/*.{ts,tsx}, Dockerfile')).toEqual([]);
  });

  it('reports the sentence a broken generator left behind', () => {
    expect(
      unmatchableScopeGlobs('All typescript rules in the spec folder'),
    ).toEqual(['All typescript rules in the spec folder']);
  });

  describe('when only part of the scope is prose', () => {
    it('reports that part alone, since the rest still applies', () => {
      expect(unmatchableScopeGlobs('src/**/*.ts, every spec file')).toEqual([
        'every spec file',
      ]);
    });
  });

  it('reports nothing on an empty scope, which is a standard that always applies', () => {
    expect(unmatchableScopeGlobs('')).toEqual([]);
  });
});
