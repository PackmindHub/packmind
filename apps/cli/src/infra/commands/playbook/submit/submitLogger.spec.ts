import { PlaybookChangeEntry } from '../../../../domain/repositories/IPlaybookLocalRepository';
import {
  formatCount,
  collectParts,
  logPackageAddGuidance,
  warnSkippedRemovals,
  fetchAvailablePackageSlugs,
} from './submitLogger';
import { PackmindCliHexa } from '../../../../PackmindCliHexa';

jest.mock('../../../utils/consoleLogger', () => ({
  logConsole: jest.fn(),
  logErrorConsole: jest.fn(),
  logInfoConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  logWarningConsole: jest.fn(),
  formatCommand: (text: string) => text,
}));

jest.mock('../../../utils/credentials', () => ({
  loadApiKey: jest.fn().mockReturnValue('fake-api-key'),
  decodeApiKey: jest
    .fn()
    .mockReturnValue({ host: 'https://app.packmind.com', jwt: {} }),
}));

const { logInfoConsole, logWarningConsole } = jest.requireMock(
  '../../../utils/consoleLogger',
) as {
  logInfoConsole: jest.Mock;
  logWarningConsole: jest.Mock;
};

const { loadApiKey } = jest.requireMock('../../../utils/credentials') as {
  loadApiKey: jest.Mock;
};

function makeEntry(
  overrides: Partial<PlaybookChangeEntry> = {},
): PlaybookChangeEntry {
  return {
    filePath: '.packmind/standards/my-standard.md',
    artifactType: 'standard',
    artifactName: 'My Standard',
    codingAgent: 'packmind',
    changeType: 'created',
    addedAt: '2026-03-17T00:00:00.000Z',
    spaceId: 'space-123',
    targetId: 'target-456',
    content: '',
    ...overrides,
  };
}

describe('formatCount', () => {
  describe('when items array is empty', () => {
    it('returns null', () => {
      expect(formatCount([], 'standard')).toBeNull();
    });
  });

  describe('when items has one element', () => {
    it('returns singular form', () => {
      expect(formatCount(['a'], 'standard')).toBe('1 standard');
    });
  });

  describe('when items has multiple elements', () => {
    it('returns plural form', () => {
      expect(formatCount(['a', 'b', 'c'], 'command')).toBe('3 commands');
    });
  });
});

describe('collectParts', () => {
  describe('when all categories have items', () => {
    it('returns all three parts', () => {
      const parts = collectParts({
        standards: ['a'],
        commands: ['b'],
        skills: ['c'],
      });

      expect(parts).toEqual(['1 standard', '1 command', '1 skill']);
    });
  });

  describe('when some categories are empty', () => {
    it('filters out empty categories', () => {
      const parts = collectParts({
        standards: ['a', 'b'],
        commands: [],
        skills: ['c'],
      });

      expect(parts).toEqual(['2 standards', '1 skill']);
    });
  });

  describe('when all categories are empty', () => {
    it('returns empty array', () => {
      const parts = collectParts({
        standards: [],
        commands: [],
        skills: [],
      });

      expect(parts).toEqual([]);
    });
  });
});

describe('logPackageAddGuidance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when a single standard is created', () => {
    it('logs a command with the standard slug', () => {
      logPackageAddGuidance(
        {
          standards: [{ slug: 'my-std' }],
          commands: [],
          skills: [],
        },
        ['my-package'],
      );

      expect(logInfoConsole).toHaveBeenCalledWith(
        expect.stringContaining('--standard my-std'),
      );
    });
  });

  describe('when a single command is created', () => {
    it('logs a command with the command slug', () => {
      logPackageAddGuidance(
        {
          standards: [],
          commands: [{ slug: 'my-cmd' }],
          skills: [],
        },
        ['my-package'],
      );

      expect(logInfoConsole).toHaveBeenCalledWith(
        expect.stringContaining('--command my-cmd'),
      );
    });
  });

  describe('when a single skill is created', () => {
    it('logs a command with the skill slug', () => {
      logPackageAddGuidance(
        {
          standards: [],
          commands: [],
          skills: [{ slug: 'my-skill' }],
        },
        ['my-package'],
      );

      expect(logInfoConsole).toHaveBeenCalledWith(
        expect.stringContaining('--skill my-skill'),
      );
    });
  });

  describe('when multiple artifacts are created', () => {
    it('logs generic guidance', () => {
      logPackageAddGuidance(
        {
          standards: [{ slug: 'std-1' }, { slug: 'std-2' }],
          commands: [],
          skills: [],
        },
        ['my-package'],
      );

      expect(logInfoConsole).toHaveBeenCalledWith(
        expect.stringContaining('for each artifact'),
      );
    });
  });

  describe('when multiple packages are available', () => {
    it('logs available packages list', () => {
      logPackageAddGuidance(
        {
          standards: [{ slug: 'my-std' }],
          commands: [],
          skills: [],
        },
        ['pkg-one', 'pkg-two'],
      );

      expect(logInfoConsole).toHaveBeenCalledWith(
        expect.stringContaining('pkg-one, pkg-two'),
      );
    });
  });

  describe('when no artifacts are created', () => {
    it('does not log anything', () => {
      logPackageAddGuidance(
        {
          standards: [],
          commands: [],
          skills: [],
        },
        ['my-package'],
      );

      expect(logInfoConsole).not.toHaveBeenCalled();
    });
  });
});

describe('warnSkippedRemovals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when skipped list is empty', () => {
    it('does not log anything', () => {
      warnSkippedRemovals([]);

      expect(logWarningConsole).not.toHaveBeenCalled();
    });
  });

  describe('when skipped list has entries', () => {
    it('logs the removal count', () => {
      warnSkippedRemovals([makeEntry(), makeEntry()]);

      expect(logWarningConsole).toHaveBeenCalledWith(
        expect.stringContaining('2 removal(s) skipped'),
      );
    });

    it('logs the host URL', () => {
      warnSkippedRemovals([makeEntry()]);

      expect(logInfoConsole).toHaveBeenCalledWith(
        expect.stringContaining('https://app.packmind.com'),
      );
    });
  });

  describe('when API key is not available', () => {
    it('still logs the warning count', () => {
      loadApiKey.mockReturnValueOnce(null);

      warnSkippedRemovals([makeEntry()]);

      expect(logWarningConsole).toHaveBeenCalled();
    });

    it('does not log a host URL', () => {
      loadApiKey.mockReturnValueOnce(null);

      warnSkippedRemovals([makeEntry()]);

      expect(logInfoConsole).not.toHaveBeenCalledWith(
        expect.stringContaining('visit:'),
      );
    });
  });
});

describe('fetchAvailablePackageSlugs', () => {
  let mockPackmindCliHexa: PackmindCliHexa;

  beforeEach(() => {
    mockPackmindCliHexa = {
      getSpaces: jest
        .fn()
        .mockResolvedValue([{ id: 'space-1', slug: 'global', name: 'Global' }]),
      listPackages: jest
        .fn()
        .mockResolvedValue([
          { id: 'pkg-1', slug: 'my-package', name: 'My Package' },
        ]),
    } as unknown as PackmindCliHexa;
  });

  describe('when a single space is relevant', () => {
    it('returns unqualified package slugs', async () => {
      const slugs = await fetchAvailablePackageSlugs(mockPackmindCliHexa, [
        'space-1' as never,
      ]);

      expect(slugs).toEqual(['my-package']);
    });
  });

  describe('when multiple spaces are relevant', () => {
    it('returns space-qualified package slugs', async () => {
      (mockPackmindCliHexa.getSpaces as jest.Mock).mockResolvedValue([
        { id: 'space-1', slug: 'global', name: 'Global' },
        { id: 'space-2', slug: 'team', name: 'Team' },
      ]);
      (mockPackmindCliHexa.listPackages as jest.Mock)
        .mockResolvedValueOnce([
          { id: 'pkg-1', slug: 'pkg-a', name: 'Package A' },
        ])
        .mockResolvedValueOnce([
          { id: 'pkg-2', slug: 'pkg-b', name: 'Package B' },
        ]);

      const slugs = await fetchAvailablePackageSlugs(mockPackmindCliHexa, [
        'space-1' as never,
        'space-2' as never,
      ]);

      expect(slugs).toEqual(['@global/pkg-a', '@team/pkg-b']);
    });
  });

  describe('when getSpaces throws', () => {
    it('returns empty array', async () => {
      (mockPackmindCliHexa.getSpaces as jest.Mock).mockRejectedValue(
        new Error('network'),
      );

      const slugs = await fetchAvailablePackageSlugs(mockPackmindCliHexa, [
        'space-1' as never,
      ]);

      expect(slugs).toEqual([]);
    });
  });
});
