import { PlaybookChangeEntry } from '../../../../domain/repositories/IPlaybookLocalRepository';
import { createMockPackmindGateway } from '../../../../mocks/createMockGateways';
import { checkForDuplicateNames } from './duplicateNameChecker';

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

describe('checkForDuplicateNames', () => {
  let mockGateway: ReturnType<typeof createMockPackmindGateway>;

  beforeEach(() => {
    mockGateway = createMockPackmindGateway();
    mockGateway.standards.list.mockResolvedValue({
      standards: [],
      total: 0,
    });
    mockGateway.commands.list.mockResolvedValue({ recipes: [] });
    mockGateway.skills.list.mockResolvedValue([]);
  });

  describe('when staged entries have duplicate slugged names', () => {
    it('returns one error', async () => {
      const entries = [
        makeEntry({ artifactName: 'My Standard' }),
        makeEntry({ artifactName: 'My Standard' }),
      ];

      const errors = await checkForDuplicateNames(entries, mockGateway);

      expect(errors).toHaveLength(1);
    });

    it('mentions staged multiple times', async () => {
      const entries = [
        makeEntry({ artifactName: 'My Standard' }),
        makeEntry({ artifactName: 'My Standard' }),
      ];

      const errors = await checkForDuplicateNames(entries, mockGateway);

      expect(errors[0]).toContain('staged multiple times');
    });
  });

  describe('when staged entries match case-insensitively', () => {
    it('returns an error for the duplicate', async () => {
      const entries = [
        makeEntry({ artifactName: 'My Standard' }),
        makeEntry({ artifactName: 'my-standard' }),
      ];

      const errors = await checkForDuplicateNames(entries, mockGateway);

      expect(errors).toHaveLength(1);
    });
  });

  describe('when a standard name collides with an existing artifact', () => {
    it('returns one error', async () => {
      mockGateway.standards.list.mockResolvedValue({
        standards: [{ name: 'My Standard', id: 'std-1', slug: 'my-standard' }],
        total: 1,
      });
      const entries = [makeEntry({ artifactName: 'My Standard' })];

      const errors = await checkForDuplicateNames(entries, mockGateway);

      expect(errors).toHaveLength(1);
    });

    it('mentions the artifact already exists', async () => {
      mockGateway.standards.list.mockResolvedValue({
        standards: [{ name: 'My Standard', id: 'std-1', slug: 'my-standard' }],
        total: 1,
      });
      const entries = [makeEntry({ artifactName: 'My Standard' })];

      const errors = await checkForDuplicateNames(entries, mockGateway);

      expect(errors[0]).toContain('already exists');
    });
  });

  describe('when a command name collides with an existing artifact', () => {
    it('returns one error', async () => {
      mockGateway.commands.list.mockResolvedValue({
        recipes: [{ name: 'My Command', id: 'cmd-1', slug: 'my-command' }],
      });
      const entries = [
        makeEntry({
          artifactType: 'command',
          artifactName: 'My Command',
        }),
      ];

      const errors = await checkForDuplicateNames(entries, mockGateway);

      expect(errors).toHaveLength(1);
    });

    it('mentions the artifact already exists', async () => {
      mockGateway.commands.list.mockResolvedValue({
        recipes: [{ name: 'My Command', id: 'cmd-1', slug: 'my-command' }],
      });
      const entries = [
        makeEntry({
          artifactType: 'command',
          artifactName: 'My Command',
        }),
      ];

      const errors = await checkForDuplicateNames(entries, mockGateway);

      expect(errors[0]).toContain('already exists');
    });
  });

  describe('when a skill name collides with an existing artifact', () => {
    it('returns one error', async () => {
      mockGateway.skills.list.mockResolvedValue([
        { name: 'My Skill', id: 'skill-1' },
      ]);
      const entries = [
        makeEntry({
          artifactType: 'skill',
          artifactName: 'My Skill',
        }),
      ];

      const errors = await checkForDuplicateNames(entries, mockGateway);

      expect(errors).toHaveLength(1);
    });

    it('mentions the artifact already exists', async () => {
      mockGateway.skills.list.mockResolvedValue([
        { name: 'My Skill', id: 'skill-1' },
      ]);
      const entries = [
        makeEntry({
          artifactType: 'skill',
          artifactName: 'My Skill',
        }),
      ];

      const errors = await checkForDuplicateNames(entries, mockGateway);

      expect(errors[0]).toContain('already exists');
    });
  });

  describe('when gateway call fails', () => {
    it('skips the collision check gracefully', async () => {
      mockGateway.standards.list.mockRejectedValue(new Error('network'));
      const entries = [makeEntry()];

      const errors = await checkForDuplicateNames(entries, mockGateway);

      expect(errors).toHaveLength(0);
    });
  });

  describe('when no duplicates exist', () => {
    it('returns an empty error array', async () => {
      const entries = [makeEntry({ artifactName: 'Unique Standard' })];

      const errors = await checkForDuplicateNames(entries, mockGateway);

      expect(errors).toHaveLength(0);
    });
  });

  describe('when entries span different spaces', () => {
    it('does not flag duplicates across spaces', async () => {
      const entries = [
        makeEntry({ artifactName: 'My Standard', spaceId: 'space-1' }),
        makeEntry({ artifactName: 'My Standard', spaceId: 'space-2' }),
      ];

      const errors = await checkForDuplicateNames(entries, mockGateway);

      expect(errors).toHaveLength(0);
    });
  });

  describe('when entries span different artifact types', () => {
    it('does not flag duplicates across types', async () => {
      const entries = [
        makeEntry({ artifactName: 'My Artifact', artifactType: 'standard' }),
        makeEntry({ artifactName: 'My Artifact', artifactType: 'command' }),
      ];

      const errors = await checkForDuplicateNames(entries, mockGateway);

      expect(errors).toHaveLength(0);
    });
  });
});
