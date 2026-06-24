import {
  formatCount,
  collectParts,
  logPackageAddGuidance,
  fetchAvailablePackageSlugs,
  logReviewUrls,
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
  loadApiKey: jest.fn(() => 'fake-key'),
  decodeApiKey: jest.fn(() => ({
    host: 'https://packmind.example',
    jwt: { organization: { slug: 'my-org' } },
  })),
}));

const { loadApiKey, decodeApiKey } = jest.requireMock(
  '../../../utils/credentials',
) as { loadApiKey: jest.Mock; decodeApiKey: jest.Mock };

const { logInfoConsole } = jest.requireMock('../../../utils/consoleLogger') as {
  logInfoConsole: jest.Mock;
};

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
  afterEach(() => jest.clearAllMocks());

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

describe('logReviewUrls', () => {
  let mockPackmindCliHexa: PackmindCliHexa;

  beforeEach(() => {
    loadApiKey.mockReturnValue('fake-key');
    decodeApiKey.mockReturnValue({
      host: 'https://packmind.example',
      jwt: { organization: { slug: 'my-org' } },
    });
    mockPackmindCliHexa = {
      getSpaces: jest.fn().mockResolvedValue([
        { id: 'space-1', slug: 'facades', name: 'Facades' },
        { id: 'space-2', slug: 'core', name: 'Core' },
      ]),
    } as unknown as PackmindCliHexa;
  });

  afterEach(() => jest.clearAllMocks());

  describe('when a single space received proposals', () => {
    it('prints the space-scoped review URL using the org slug', async () => {
      await logReviewUrls(mockPackmindCliHexa, ['space-1']);

      expect(logInfoConsole).toHaveBeenCalledWith(
        'Review your change proposals at: https://packmind.example/org/my-org/space/facades/review-changes/',
      );
    });
  });

  describe('when multiple spaces received proposals', () => {
    it('lists one review URL per space', async () => {
      await logReviewUrls(mockPackmindCliHexa, ['space-1', 'space-2']);

      expect(logInfoConsole.mock.calls.map((c) => c[0])).toEqual([
        'Review your change proposals at:',
        '  - https://packmind.example/org/my-org/space/facades/review-changes/',
        '  - https://packmind.example/org/my-org/space/core/review-changes/',
      ]);
    });
  });

  describe('when no space ids are provided', () => {
    it('prints nothing', async () => {
      await logReviewUrls(mockPackmindCliHexa, []);

      expect(logInfoConsole).not.toHaveBeenCalled();
    });
  });

  describe('when credentials are missing', () => {
    it('prints nothing', async () => {
      loadApiKey.mockReturnValue(null);

      await logReviewUrls(mockPackmindCliHexa, ['space-1']);

      expect(logInfoConsole).not.toHaveBeenCalled();
    });
  });

  describe('when getSpaces throws', () => {
    it('prints nothing', async () => {
      (mockPackmindCliHexa.getSpaces as jest.Mock).mockRejectedValue(
        new Error('network'),
      );

      await logReviewUrls(mockPackmindCliHexa, ['space-1']);

      expect(logInfoConsole).not.toHaveBeenCalled();
    });
  });
});
