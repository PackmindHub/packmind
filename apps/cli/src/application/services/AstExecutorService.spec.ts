import { AstExecutorService } from './AstExecutorService';

// Mock web-tree-sitter
jest.mock('web-tree-sitter', () => {
  const mockParse = jest.fn();
  const mockSetLanguage = jest.fn();
  const mockInit = jest.fn().mockResolvedValue(undefined);
  const mockLanguageLoad = jest.fn().mockResolvedValue({});

  function MockParserConstructor() {
    return {
      setLanguage: mockSetLanguage,
      parse: mockParse,
    };
  }

  MockParserConstructor.init = mockInit;
  MockParserConstructor.Language = { load: mockLanguageLoad };
  MockParserConstructor.mockParse = mockParse;
  MockParserConstructor.mockSetLanguage = mockSetLanguage;
  MockParserConstructor.mockInit = mockInit;
  MockParserConstructor.mockLanguageLoad = mockLanguageLoad;

  return MockParserConstructor;
});

// Import mocked module
import Parser from 'web-tree-sitter';
type MockedParser = typeof Parser & {
  mockParse: jest.MockedFunction<(input: string) => { rootNode: unknown }>;
};
const mockParse = (Parser as MockedParser).mockParse;

describe('AstExecutorService', () => {
  let service: AstExecutorService;

  beforeEach(() => {
    service = new AstExecutorService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when parser initializes successfully', () => {
    beforeEach(() => {
      // Setup mock tree structure
      const mockNode = {
        type: 'source_file',
        text: 'interface User {}',
        startPosition: { row: 0 },
        childCount: 1,
        child: () => ({
          type: 'interface_declaration',
          text: 'interface User {}',
          startPosition: { row: 0 },
          childCount: 0,
          child: () => null,
        }),
      };

      const mockTree = {
        rootNode: mockNode,
      };

      mockParse.mockReturnValue(mockTree);
    });

    it('executes program and returns violations', async () => {
      const program = `
        function checkSourceCode(ast) {
          return [1, 3];
        }
      `;

      const result = await service.executeProgram(program, 'interface User {}');

      expect(result).toEqual([
        { line: 1, character: 0 },
        { line: 3, character: 0 },
      ]);
    });

    describe('when no violations are found', () => {
      it('returns empty array', async () => {
        const program = `
        function checkSourceCode(ast) {
          return [];
        }
      `;

        const result = await service.executeProgram(
          program,
          'interface IUser {}',
        );

        expect(result).toEqual([]);
      });
    });

    it('handles empty file content', async () => {
      const program = `
        function checkSourceCode(ast) {
          return [];
        }
      `;

      const result = await service.executeProgram(program, '');

      expect(result).toEqual([]);
    });

    it('converts AST to simple format before passing to program', async () => {
      const program = `
        function checkSourceCode(ast) {
          if (ast.type === 'source_file' && ast.line === 1) {
            return [1];
          }
          return [];
        }
      `;

      const result = await service.executeProgram(program, 'interface User {}');

      expect(result).toEqual([{ line: 1, character: 0 }]);
    });
  });

  describe('when program is invalid', () => {
    it('throws error for invalid JavaScript program', async () => {
      const invalidProgram = 'this is not valid javascript { }';

      await expect(
        service.executeProgram(invalidProgram, 'interface User {}'),
      ).rejects.toThrow('Failed to parse program');
    });
  });

  describe('when program throws runtime error', () => {
    it('propagates program execution errors', async () => {
      const program = `
        function checkSourceCode(ast) {
          throw new Error('Runtime error in program');
        }
      `;

      await expect(
        service.executeProgram(program, 'interface User {}'),
      ).rejects.toThrow('Runtime error in program');
    });
  });
});
