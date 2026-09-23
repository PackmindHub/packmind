import { selectItemType } from './selectItemType';
import { logErrorConsole } from '../../utils/consoleLogger';

jest.mock('../../utils/consoleLogger', () => ({
  logErrorConsole: jest.fn(),
}));

const mockLogErrorConsole = logErrorConsole as jest.Mock;

/** Stands in for `process.exit`, which never returns to its caller. */
function exitThrowing(code: number): never {
  throw new Error(`exit ${code}`);
}

describe('selectItemType', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when a single kind is named', () => {
    it('returns that kind', () => {
      const selected = selectItemType(
        { commands: ['my-command'] },
        'move',
        exitThrowing,
      );

      expect(selected).toEqual({
        itemType: 'command',
        itemSlugs: ['my-command'],
      });
    });
  });

  describe('when no kind is named', () => {
    it('exits', () => {
      expect(() => selectItemType({}, 'move', exitThrowing)).toThrow('exit 1');
    });

    it('says one is required', () => {
      expect(() => selectItemType({}, 'move', exitThrowing)).toThrow();
      expect(mockLogErrorConsole).toHaveBeenCalledWith(
        'Error: At least one --standard, --command, or --skill is required',
      );
    });
  });

  describe('when several kinds are named', () => {
    it('names the refused verb', () => {
      expect(() =>
        selectItemType(
          { commands: ['my-command'], skills: ['my-skill'] },
          'remove',
          exitThrowing,
        ),
      ).toThrow('exit 1');
      expect(mockLogErrorConsole).toHaveBeenCalledWith(
        'Cannot remove standards, commands, and skills simultaneously. Use one invocation per artefact type.',
      );
    });
  });
});
