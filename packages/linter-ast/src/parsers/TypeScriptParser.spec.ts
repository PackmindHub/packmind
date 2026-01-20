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
    describe('when parsing valid TypeScript code', () => {
      const sourceCode = 'const x: number = 42;';
      let ast: Awaited<ReturnType<typeof parser.parse>>;

      beforeEach(async () => {
        ast = await parser.parse(sourceCode);
      });

      it('returns a defined AST', () => {
        expect(ast).toBeDefined();
      });

      it('returns a program node type', () => {
        expect(ast.type).toBe('program');
      });

      it('returns defined children', () => {
        expect(ast.children).toBeDefined();
      });

      it('returns children as an array', () => {
        expect(Array.isArray(ast.children)).toBe(true);
      });
    });

    describe('when auto-initializing', () => {
      const sourceCode = 'const x = 42;';
      let ast: Awaited<ReturnType<typeof parser.parse>>;

      beforeEach(async () => {
        ast = await parser.parse(sourceCode);
      });

      it('returns a defined AST', () => {
        expect(ast).toBeDefined();
      });

      it('sets initialized flag to true', () => {
        expect(parser['initialized']).toBe(true);
      });
    });

    describe('when parsing empty string', () => {
      let ast: Awaited<ReturnType<typeof parser.parse>>;

      beforeEach(async () => {
        ast = await parser.parse('');
      });

      it('returns a defined AST', () => {
        expect(ast).toBeDefined();
      });

      it('returns a program node type', () => {
        expect(ast.type).toBe('program');
      });
    });

    describe('when parsing complex TypeScript code', () => {
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
      let ast: Awaited<ReturnType<typeof parser.parse>>;

      beforeEach(async () => {
        ast = await parser.parse(sourceCode);
      });

      it('returns a defined AST', () => {
        expect(ast).toBeDefined();
      });

      it('returns a program node type', () => {
        expect(ast.type).toBe('program');
      });

      it('returns children with content', () => {
        expect(ast.children.length).toBeGreaterThan(0);
      });
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
