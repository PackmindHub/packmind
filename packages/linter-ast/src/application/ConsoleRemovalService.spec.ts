import { ConsoleLogRemovalService } from './ConsoleLogRemovalService';
import { ProgrammingLanguage } from '@packmind/types';

describe('ConsoleLogRemovalService', () => {
  let consoleLogRemovalService: ConsoleLogRemovalService;

  beforeEach(() => {
    consoleLogRemovalService = new ConsoleLogRemovalService();
  });

  describe('language validation', () => {
    it('throws error for non-JavaScript language', async () => {
      const program = 'const x = 1;';

      await expect(
        consoleLogRemovalService.removeConsoleLogStatements(
          program,
          ProgrammingLanguage.TYPESCRIPT,
        ),
      ).rejects.toThrow(
        'ConsoleRemovalService only supports JAVASCRIPT, received: TYPESCRIPT',
      );
    });

    it('throws error for Python language', async () => {
      const program = 'x = 1';

      await expect(
        consoleLogRemovalService.removeConsoleLogStatements(
          program,
          ProgrammingLanguage.PYTHON,
        ),
      ).rejects.toThrow(
        'ConsoleRemovalService only supports JAVASCRIPT, received: PYTHON',
      );
    });
  });

  describe('AST-based console removal', () => {
    it('removes console.log with simple string', async () => {
      const program = `function test() {
  console.log('message');
  return true;
}`;
      const expected = `function test() {

  return true;
}`;
      const result = await consoleLogRemovalService.removeConsoleLogStatements(
        program,
        ProgrammingLanguage.JAVASCRIPT,
      );
      expect(result).toEqual(expected);
    });

    it('removes console.error with string', async () => {
      const program = `function test() {
  console.error('error');
  return false;
}`;
      const expected = `function test() {

  return false;
}`;
      const result = await consoleLogRemovalService.removeConsoleLogStatements(
        program,
        ProgrammingLanguage.JAVASCRIPT,
      );
      expect(result).toEqual(expected);
    });

    it('removes multiple console statements', async () => {
      const program = `function test() {
  console.log('first');
  console.error('second');
  return true;
}`;
      const expected = `function test() {


  return true;
}`;
      const result = await consoleLogRemovalService.removeConsoleLogStatements(
        program,
        ProgrammingLanguage.JAVASCRIPT,
      );
      expect(result).toEqual(expected);
    });

    it('preserves non-console code', async () => {
      const program = `function test() {
  const message = 'This is about console usage';
  console.log(message);
  return message;
}`;
      const expected = `function test() {
  const message = 'This is about console usage';

  return message;
}`;
      const result = await consoleLogRemovalService.removeConsoleLogStatements(
        program,
        ProgrammingLanguage.JAVASCRIPT,
      );
      expect(result).toEqual(expected);
    });

    it('removes console.debug statements', async () => {
      const program = `function test() {
  console.debug('debug info');
  return true;
}`;
      const expected = `function test() {

  return true;
}`;
      const result = await consoleLogRemovalService.removeConsoleLogStatements(
        program,
        ProgrammingLanguage.JAVASCRIPT,
      );
      expect(result).toEqual(expected);
    });

    it('removes console.warn statements', async () => {
      const program = `function test() {
  console.warn('warning');
  return true;
}`;
      const expected = `function test() {

  return true;
}`;
      const result = await consoleLogRemovalService.removeConsoleLogStatements(
        program,
        ProgrammingLanguage.JAVASCRIPT,
      );
      expect(result).toEqual(expected);
    });

    it('handles console statements in nested blocks', async () => {
      const program = `function test() {
  if (true) {
    console.log('nested');
  }
  return true;
}`;
      const expected = `function test() {
  if (true) {

  }
  return true;
}`;
      const result = await consoleLogRemovalService.removeConsoleLogStatements(
        program,
        ProgrammingLanguage.JAVASCRIPT,
      );
      expect(result).toEqual(expected);
    });

    it('handles empty source code', async () => {
      const program = '';
      const result = await consoleLogRemovalService.removeConsoleLogStatements(
        program,
        ProgrammingLanguage.JAVASCRIPT,
      );
      expect(result).toEqual('');
    });

    it('handles code without console statements', async () => {
      const program = `function test() {
  const x = 1;
  return x;
}`;
      const result = await consoleLogRemovalService.removeConsoleLogStatements(
        program,
        ProgrammingLanguage.JAVASCRIPT,
      );
      expect(result).toEqual(program);
    });
  });
});
