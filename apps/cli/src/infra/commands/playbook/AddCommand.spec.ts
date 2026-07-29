// cmd-ts ships untransformed TypeScript sources, so it is mocked here rather
// than executed — the same approach the other *Command specs take. Real argv
// parsing is covered by the CLI end-to-end tests.
jest.mock('cmd-ts', () => ({
  command: jest.fn((definition) => definition),
  option: jest.fn((config) => ({ kind: 'option', ...config })),
  optional: jest.fn((type) => type),
  restPositionals: jest.fn((config) => ({
    kind: 'restPositionals',
    ...config,
  })),
  string: 'string',
}));

jest.mock('./addHandler', () => ({
  playbookAddHandler: jest.fn(),
}));

jest.mock('../../../PackmindCliHexa', () => ({
  PackmindCliHexa: jest.fn().mockImplementation(() => ({
    tryGetGitRepositoryRoot: jest.fn().mockResolvedValue('/project'),
  })),
}));

jest.mock('../../repositories/PlaybookLocalRepository', () => ({
  PlaybookLocalRepository: jest.fn(),
}));

jest.mock('../../repositories/LockFileRepository', () => ({
  LockFileRepository: jest.fn(),
}));

jest.mock('../../utils/readSkillDirectory', () => ({
  readSkillDirectory: jest.fn(),
}));

import { addPlaybookCommand } from './AddCommand';
import { playbookAddHandler } from './addHandler';

describe('addPlaybookCommand', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when declaring its path argument', () => {
    it('takes an unbounded list of positionals', () => {
      expect(addPlaybookCommand.args.filePaths).toEqual(
        expect.objectContaining({ kind: 'restPositionals' }),
      );
    });

    it('names the argument in the plural for the usage line', () => {
      expect(addPlaybookCommand.args.filePaths).toEqual(
        expect.objectContaining({ displayName: 'paths' }),
      );
    });
  });

  describe('when several paths are parsed', () => {
    it('forwards every path in order', async () => {
      await addPlaybookCommand.handler({
        filePaths: ['first/SKILL.md', 'second/SKILL.md'],
        space: undefined,
      });

      expect(playbookAddHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          filePaths: ['first/SKILL.md', 'second/SKILL.md'],
        }),
      );
    });

    it('forwards the space option alongside them', async () => {
      await addPlaybookCommand.handler({
        filePaths: ['first/SKILL.md', 'second/SKILL.md'],
        space: 'my-space',
      });

      expect(playbookAddHandler).toHaveBeenCalledWith(
        expect.objectContaining({ spaceSlug: 'my-space' }),
      );
    });
  });

  describe('when no path is parsed', () => {
    it('forwards an empty list for the handler to reject', async () => {
      await addPlaybookCommand.handler({ filePaths: [], space: undefined });

      expect(playbookAddHandler).toHaveBeenCalledWith(
        expect.objectContaining({ filePaths: [] }),
      );
    });
  });
});
