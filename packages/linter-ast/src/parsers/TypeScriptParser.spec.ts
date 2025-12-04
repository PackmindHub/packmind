import TypeScriptParser from './TypeScriptParser';

// Skip these tests as they require WASM files which are not available in test environment
describe.skip('TypeScriptParser', () => {
  let parser: TypeScriptParser;

  beforeEach(() => {
    parser = new TypeScriptParser();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLanguage', () => {
    it('returns typescript', () => {
      expect(parser.getLanguage()).toBe('typescript');
    });
  });

  describe('initialize', () => {
    it('initializes parser successfully', async () => {
      await expect(parser.initialize()).resolves.not.toThrow();
    });

    it('sets initialized flag to true', async () => {
      await parser.initialize();

      expect(parser['initialized']).toBe(true);
    });
  });

  describe('parse', () => {
    it('parses valid TypeScript code', async () => {
      const sourceCode = 'const x: number = 42;';

      const ast = await parser.parse(sourceCode);

      expect(ast).toBeDefined();
      expect(ast.type).toBe('program');
      expect(ast.children).toBeDefined();
      expect(Array.isArray(ast.children)).toBe(true);
    });

    it('auto-initializes if not initialized', async () => {
      const sourceCode = 'const x = 42;';

      const ast = await parser.parse(sourceCode);

      expect(ast).toBeDefined();
      expect(parser['initialized']).toBe(true);
    });

    it('parses empty string', async () => {
      const ast = await parser.parse('');

      expect(ast).toBeDefined();
      expect(ast.type).toBe('program');
    });

    it('parses complex TypeScript code', async () => {
      const sourceCode = `
        interface Person {
          name: string;
          age: number;
        }
        
        const person: Person = {
          name: 'John',
          age: 30
        };
      `;

      const ast = await parser.parse(sourceCode);

      expect(ast).toBeDefined();
      expect(ast.type).toBe('program');
      expect(ast.children.length).toBeGreaterThan(0);
    });
  });

  describe('nodeToJson', () => {
    it('skips text for program nodes', async () => {
      const sourceCode = 'const x = 1;';

      const ast = await parser.parse(sourceCode);

      expect(ast.text).toBe('<skipped>');
    });

    it('includes text for non-program nodes', async () => {
      const sourceCode = 'const x = 1;';

      const ast = await parser.parse(sourceCode);
      const firstChild = ast.children[0];

      expect(firstChild.text).not.toBe('<skipped>');
    });

    it('includes line numbers', async () => {
      const sourceCode = 'const x = 1;\nconst y = 2;';

      const ast = await parser.parse(sourceCode);

      expect(ast.line).toBe(0);
    });
  });
});
