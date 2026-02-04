import { AddToPackageUseCase } from './AddToPackageUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';

describe('AddToPackageUseCase', () => {
  let useCase: AddToPackageUseCase;
  let mockGateway: jest.Mocked<IPackmindGateway>;

  beforeEach(() => {
    mockGateway = {
      spaces: { getGlobal: jest.fn().mockResolvedValue({ id: 'space-123' }) },
      packages: { addArtefacts: jest.fn() },
      standards: { getBySlug: jest.fn() },
      commands: { getBySlug: jest.fn() },
      skills: { getBySlug: jest.fn() },
    } as unknown as jest.Mocked<IPackmindGateway>;

    useCase = new AddToPackageUseCase(mockGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when adding standards', () => {
    beforeEach(() => {
      mockGateway.standards.getBySlug
        .mockResolvedValueOnce({
          id: 'std-id-1',
          slug: 'std-1',
          name: 'Std 1',
          description: 'desc',
        })
        .mockResolvedValueOnce({
          id: 'std-id-2',
          slug: 'std-2',
          name: 'Std 2',
          description: 'desc',
        });
      mockGateway.packages.addArtefacts.mockResolvedValue({
        added: { standards: ['std-1', 'std-2'], commands: [], skills: [] },
        skipped: { standards: [], commands: [], skills: [] },
      });
    });

    it('resolves slugs to IDs and calls gateway with standardIds', async () => {
      await useCase.execute({
        packageSlug: 'my-package',
        itemType: 'standard',
        itemSlugs: ['std-1', 'std-2'],
      });

      expect(mockGateway.packages.addArtefacts).toHaveBeenCalledWith({
        packageSlug: 'my-package',
        spaceId: 'space-123',
        standardIds: ['std-id-1', 'std-id-2'],
      });
    });

    it('returns added items from gateway response', async () => {
      const result = await useCase.execute({
        packageSlug: 'my-package',
        itemType: 'standard',
        itemSlugs: ['std-1', 'std-2'],
      });

      expect(result.added).toEqual(['std-1', 'std-2']);
    });
  });

  describe('when adding commands', () => {
    beforeEach(() => {
      mockGateway.commands.getBySlug.mockResolvedValueOnce({
        id: 'cmd-id-1',
        slug: 'cmd-1',
        name: 'Cmd 1',
      });
      mockGateway.packages.addArtefacts.mockResolvedValue({
        added: { standards: [], commands: ['cmd-1'], skills: [] },
        skipped: { standards: [], commands: [], skills: [] },
      });
    });

    it('calls gateway with commandIds', async () => {
      await useCase.execute({
        packageSlug: 'my-package',
        itemType: 'command',
        itemSlugs: ['cmd-1'],
      });

      expect(mockGateway.packages.addArtefacts).toHaveBeenCalledWith({
        packageSlug: 'my-package',
        spaceId: 'space-123',
        commandIds: ['cmd-id-1'],
      });
    });

    it('returns added commands from gateway response', async () => {
      const result = await useCase.execute({
        packageSlug: 'my-package',
        itemType: 'command',
        itemSlugs: ['cmd-1'],
      });

      expect(result.added).toEqual(['cmd-1']);
    });
  });

  describe('when adding skills', () => {
    beforeEach(() => {
      mockGateway.skills.getBySlug.mockResolvedValueOnce({
        id: 'skill-id-1',
        slug: 'skill-1',
        name: 'Skill 1',
      });
      mockGateway.packages.addArtefacts.mockResolvedValue({
        added: { standards: [], commands: [], skills: ['skill-1'] },
        skipped: { standards: [], commands: [], skills: [] },
      });
    });

    it('calls gateway with skillIds', async () => {
      await useCase.execute({
        packageSlug: 'my-package',
        itemType: 'skill',
        itemSlugs: ['skill-1'],
      });

      expect(mockGateway.packages.addArtefacts).toHaveBeenCalledWith({
        packageSlug: 'my-package',
        spaceId: 'space-123',
        skillIds: ['skill-id-1'],
      });
    });

    it('returns added skills from gateway response', async () => {
      const result = await useCase.execute({
        packageSlug: 'my-package',
        itemType: 'skill',
        itemSlugs: ['skill-1'],
      });

      expect(result.added).toEqual(['skill-1']);
    });
  });

  describe('when standard does not exist', () => {
    it('throws error with standard slug', async () => {
      mockGateway.standards.getBySlug.mockResolvedValue(null);

      await expect(
        useCase.execute({
          packageSlug: 'my-package',
          itemType: 'standard',
          itemSlugs: ['non-existent'],
        }),
      ).rejects.toThrow("standard 'non-existent' not found");
    });
  });

  describe('when some items are skipped', () => {
    let result: { added: string[]; skipped: string[] };

    beforeEach(async () => {
      mockGateway.standards.getBySlug
        .mockResolvedValueOnce({
          id: 'std-id-1',
          slug: 'std-1',
          name: 'Std 1',
          description: 'desc',
        })
        .mockResolvedValueOnce({
          id: 'std-id-2',
          slug: 'std-2',
          name: 'Std 2',
          description: 'desc',
        });
      mockGateway.packages.addArtefacts.mockResolvedValue({
        added: { standards: ['std-2'], commands: [], skills: [] },
        skipped: { standards: ['std-1'], commands: [], skills: [] },
      });

      result = await useCase.execute({
        packageSlug: 'my-package',
        itemType: 'standard',
        itemSlugs: ['std-1', 'std-2'],
      });
    });

    it('returns added items', () => {
      expect(result.added).toEqual(['std-2']);
    });

    it('returns skipped items', () => {
      expect(result.skipped).toEqual(['std-1']);
    });
  });
});
