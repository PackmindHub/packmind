import { extractionsViolationsFromRawOutput } from './ProgramExecutionUtils';

describe('extractionsViolationsFromRawOutput', () => {
  it('returns the array as a string suffixed by "Output:"', () => {
    const programOutput = `
                Blabla 
                Hello
                Output: [1, 2, 3, 4, 5]
            `;
    const expectedOutput = [1, 2, 3, 4, 5];
    const result = extractionsViolationsFromRawOutput(programOutput);
    expect(result).toEqual(expectedOutput);
  });

  it('returns the array as a string', () => {
    const programOutput = `
                Blabla 
                Hello
                [1, 2, 3, 4, 5]
            `;
    const expectedOutput = [1, 2, 3, 4, 5];
    const result = extractionsViolationsFromRawOutput(programOutput);
    expect(result).toEqual(expectedOutput);
  });

  it('filters out negative line numbers and deduplicates', () => {
    const programOutput = `
                Blabla 
                Hello
                Output: [1, 2, 3, 4, 5, -1, 2, 3]
            `;
    const expectedOutput = [1, 2, 3, 4, 5];
    const result = extractionsViolationsFromRawOutput(programOutput);
    expect(result).toEqual(expectedOutput);
  });

  it('handles complex output with duplicates and debugging info', () => {
    const programOutput = `
                Debug: Starting analysis
                Processing file: test.js
                Found violations at lines: [1, 2, 3, 4, 5]
                Output: [1, 2, 3, 4, 5]
            `;
    const expectedOutput = [1, 2, 3, 4, 5];
    const result = extractionsViolationsFromRawOutput(programOutput);
    expect(result).toEqual(expectedOutput);
  });

  describe('when the raw output contains only an array', () => {
    it('returns [0]', () => {
      const programOutput = '[0]';
      const expectedOutput = [0];
      const result = extractionsViolationsFromRawOutput(programOutput);
      expect(result).toEqual(expectedOutput);
    });

    it('returns [14]', () => {
      const programOutput = '[14]';
      const expectedOutput = [14];
      const result = extractionsViolationsFromRawOutput(programOutput);
      expect(result).toEqual(expectedOutput);
    });

    it('returns [14, 18]', () => {
      const programOutput = '[14, 18]';
      const expectedOutput = [14, 18];
      const result = extractionsViolationsFromRawOutput(programOutput);
      expect(result).toEqual(expectedOutput);
    });
  });

  describe('when the raw output contains debugging information', () => {
    it('returns the array of violations', () => {
      const programOutput = `
                Debug: Starting analysis
                Processing file: test.js
                Found violations at lines: [1, 2, 3, 4, 5]
                Output: [1, 2, 3, 4, 5]
            `;
      const expectedOutput = [1, 2, 3, 4, 5];
      const result = extractionsViolationsFromRawOutput(programOutput);
      expect(result).toEqual(expectedOutput);
    });
  });

  describe('when the array contains violations with line breaks', () => {
    it('returns an array of line numbers', () => {
      const programOutput = `
                Blabla 
                Hello
                Output: [1, 2, 3, 4, 5]
            `;
      const expectedOutput = [1, 2, 3, 4, 5];
      const result = extractionsViolationsFromRawOutput(programOutput);
      expect(result).toEqual(expectedOutput);
    });
  });

  describe('when raw output contains duplicates', () => {
    it('returns unique and sorted line numbers', () => {
      const programOutput = `
                Blabla 
                Hello
                Output: [1, 2, 3, 4, 5, 1, 2, 3]
            `;
      const expectedOutput = [1, 2, 3, 4, 5];
      const result = extractionsViolationsFromRawOutput(programOutput);
      expect(result).toEqual(expectedOutput);
    });
  });

  describe('when output contains ANSI color codes', () => {
    it('strips ANSI escape sequences and parses correctly', () => {
      const programOutput = `
                \x1b[32mDebug: Starting analysis\x1b[0m
                \x1b[33mProcessing file: test.js\x1b[0m
                \x1b[31mFound violations at lines: [1, 2, 3, 4, 5]\x1b[0m
                Output: [1, 2, 3, 4, 5]
            `;
      const expectedOutput = [1, 2, 3, 4, 5];
      const result = extractionsViolationsFromRawOutput(programOutput);
      expect(result).toEqual(expectedOutput);
    });

    it('handles complex output with ANSI codes and debugging info', () => {
      const programOutput = `
                \x1b[32mDebug: Starting analysis\x1b[0m
                \x1b[33mProcessing file: test.js\x1b[0m
                \x1b[31mFound violations at lines: [1, 2, 3, 4, 5]\x1b[0m
                \x1b[32mOutput: [1, 2, 3, 4, 5]\x1b[0m
            `;
      const expectedOutput = [1, 2, 3, 4, 5];
      const result = extractionsViolationsFromRawOutput(programOutput);
      expect(result).toEqual(expectedOutput);
    });
  });
});

describe('extractionsViolationsFromRawOutput (additional tests)', () => {
  it('returns the array as a string suffixed by "Output:"', () => {
    const programOutput = `
                Blabla 
                Hello
                Output: [1, 2, 3, 4, 5]
            `;
    const expectedOutput = [1, 2, 3, 4, 5];
    const result = extractionsViolationsFromRawOutput(programOutput);
    expect(result).toEqual(expectedOutput);
  });

  it('returns the array as a string', () => {
    const programOutput = `
                Blabla 
                Hello
                [1, 2, 3, 4, 5]
            `;
    const expectedOutput = [1, 2, 3, 4, 5];
    const result = extractionsViolationsFromRawOutput(programOutput);
    expect(result).toEqual(expectedOutput);
  });
});
