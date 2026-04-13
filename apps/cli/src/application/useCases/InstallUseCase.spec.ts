import * as fs from 'fs/promises';

import { InstallUseCase } from './InstallUseCase';
import { createMockPackmindGateway } from '../../mocks/createMockGateways';
import {
  createMockConfigFileRepository,
  createMockLockFileRepository,
} from '../../mocks/createMockRepositories';
import { createMockSpaceService } from '../../mocks/createMockServices';
import { spaceFactory } from '@packmind/spaces/test';
import {
  createOrganizationId,
  createSpaceId,
  DeleteItemType,
  PackmindLockFile,
  SpaceType,
} from '@packmind/types';

jest.mock('fs/promises');

const lockFileFactory = (
  overrides: Partial<PackmindLockFile> = {},
): PackmindLockFile => ({
  lockfileVersion: 1,
  packageSlugs: [],
  agents: [],
  installedAt: new Date().toISOString(),
  artifacts: {},
  ...overrides,
});

const installResponseFactory = (
  overrides: Partial<{
    createOrUpdate: {
      path: string;
      content?: string;
      sections?: { key: string; content: string }[];
      isBase64?: boolean;
      skillFilePermissions?: string;
    }[];
    delete: { path: string; type: DeleteItemType }[];
    skillFolders: string[];
    missingAccess: string[];
  }> = {},
) => ({
  fileUpdates: {
    createOrUpdate: overrides.createOrUpdate ?? [],
    delete: overrides.delete ?? [],
  },
  skillFolders: overrides.skillFolders ?? [],
  missingAccess: overrides.missingAccess ?? [],
  resolvedAgents: [],
});

describe('InstallUseCase', () => {
  let useCase: InstallUseCase;
  let mockGateway: ReturnType<typeof createMockPackmindGateway>;
  let mockLockFileRepository: ReturnType<typeof createMockLockFileRepository>;
  let mockConfigFileRepository: ReturnType<
    typeof createMockConfigFileRepository
  >;
  let mockSpaceService: ReturnType<typeof createMockSpaceService>;

  beforeEach(() => {
    mockGateway = createMockPackmindGateway();
    mockLockFileRepository = createMockLockFileRepository();
    mockConfigFileRepository = createMockConfigFileRepository();
    mockSpaceService = createMockSpaceService();

    // Setup fs mocks
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.appendFile as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockResolvedValue('');
    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);
    (fs.stat as jest.Mock).mockResolvedValue(null);
    (fs.rm as jest.Mock).mockResolvedValue(undefined);
    (fs.readdir as jest.Mock).mockResolvedValue([]);
    (fs.rmdir as jest.Mock).mockResolvedValue(undefined);
    (fs.chmod as jest.Mock).mockResolvedValue(undefined);

    // Default: packmind.json and lock file exist with one package, install returns empty response
    mockConfigFileRepository.readConfig.mockResolvedValue({
      packages: { '@space/test-package': '*' },
    });
    mockLockFileRepository.read.mockResolvedValue(
      lockFileFactory({ packageSlugs: ['@space/test-package'] }),
    );
    mockGateway.deployment.install.mockResolvedValue(installResponseFactory());

    useCase = new InstallUseCase(
      mockGateway,
      mockLockFileRepository,
      mockConfigFileRepository,
      mockSpaceService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when no packmind.json exists and no explicit packages are provided', () => {
    beforeEach(() => {
      mockConfigFileRepository.readConfig.mockResolvedValue(null);
    });

    it('throws an error indicating packmind.json is missing', async () => {
      await expect(useCase.execute({ baseDirectory: '/test' })).rejects.toThrow(
        'No packmind.json found in this directory. Run `packmind-cli install <@space/package>` first to install your packages.',
      );
    });
  });

  describe('when no lock file exists but explicit packages are provided', () => {
    const mySpace = spaceFactory({
      id: createSpaceId('space-1'),
      slug: 'my-space',
    });

    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue(null);
      mockConfigFileRepository.readConfig.mockResolvedValue(null);
      mockSpaceService.getSpaces.mockResolvedValue([mySpace]);
      mockSpaceService.getDefaultSpace.mockResolvedValue(mySpace);
      mockSpaceService.getApiContext.mockReturnValue({
        host: 'https://app.packmind.com',
        organizationId: 'org-1',
      });
    });

    it('proceeds without throwing', async () => {
      await expect(
        useCase.execute({
          packages: ['@my-space/my-package'],
          baseDirectory: '/test',
        }),
      ).resolves.not.toThrow();
    });

    it('calls install with the provided package slug', async () => {
      await useCase.execute({
        packages: ['@my-space/my-package'],
        baseDirectory: '/test',
      });

      expect(mockGateway.deployment.install).toHaveBeenCalledWith(
        expect.objectContaining({
          packagesSlugs: expect.arrayContaining(['@my-space/my-package']),
        }),
      );
    });

    it('updates packmind.json with the installed package slug', async () => {
      await useCase.execute({
        packages: ['@my-space/my-package'],
        baseDirectory: '/test',
      });

      expect(mockConfigFileRepository.addPackagesToConfig).toHaveBeenCalledWith(
        '/test',
        ['@my-space/my-package'],
      );
    });
  });

  describe('when packmind.json exists with packages and no explicit packages are provided', () => {
    beforeEach(() => {
      mockConfigFileRepository.readConfig.mockResolvedValue({
        packages: { '@space/pkg-a': '*', '@space/pkg-b': '*' },
      });
      mockLockFileRepository.read.mockResolvedValue(
        lockFileFactory({ packageSlugs: ['@space/pkg-a', '@space/pkg-b'] }),
      );
    });

    it('calls install with the packmind.json package slugs', async () => {
      await useCase.execute({ baseDirectory: '/test' });

      expect(mockGateway.deployment.install).toHaveBeenCalledWith(
        expect.objectContaining({
          packagesSlugs: ['@space/pkg-a', '@space/pkg-b'],
        }),
      );
    });

    it('passes the lock file to the install call for artifact preservation', async () => {
      await useCase.execute({ baseDirectory: '/test' });

      expect(mockGateway.deployment.install).toHaveBeenCalledWith(
        expect.objectContaining({
          packmindLockFile: expect.objectContaining({
            packageSlugs: ['@space/pkg-a', '@space/pkg-b'],
          }),
        }),
      );
    });

    it('does not update packmind.json', async () => {
      await useCase.execute({ baseDirectory: '/test' });

      expect(
        mockConfigFileRepository.addPackagesToConfig,
      ).not.toHaveBeenCalled();
    });

    describe('when packmind.json has agents configured', () => {
      beforeEach(() => {
        mockConfigFileRepository.readConfig.mockResolvedValue({
          packages: { '@space/pkg-a': '*' },
          agents: ['claude-code', 'cursor'],
        });
      });

      it('passes agents from packmind.json to the install call', async () => {
        await useCase.execute({ baseDirectory: '/test' });

        expect(mockGateway.deployment.install).toHaveBeenCalledWith(
          expect.objectContaining({
            agents: ['claude-code', 'cursor'],
          }),
        );
      });
    });

    describe('when packmind.json has no agents configured', () => {
      it('passes undefined agents to the install call', async () => {
        await useCase.execute({ baseDirectory: '/test' });

        expect(mockGateway.deployment.install).toHaveBeenCalledWith(
          expect.objectContaining({
            agents: undefined,
          }),
        );
      });
    });
  });

  describe('when packmind.json exists with an empty packages list', () => {
    beforeEach(() => {
      mockConfigFileRepository.readConfig.mockResolvedValue({ packages: {} });
      mockLockFileRepository.read.mockResolvedValue(
        lockFileFactory({
          artifacts: {
            'artifact-1': {
              name: 'my-recipe',
              type: 'recipe',
              id: 'artifact-1',
              version: 1,
              spaceId: 'space-1',
              packageIds: ['pkg-1'],
              files: [
                {
                  path: '.packmind/recipes/my-recipe.md',
                  agent: 'claude-code',
                },
              ],
            },
          },
        }),
      );
    });

    it('does not call the gateway', async () => {
      await useCase.execute({ baseDirectory: '/test' });

      expect(mockGateway.deployment.install).not.toHaveBeenCalled();
    });

    it('deletes all artifact files tracked in the lock file', async () => {
      (fs.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false,
      });

      await useCase.execute({ baseDirectory: '/test' });

      expect(fs.unlink).toHaveBeenCalledWith(
        '/test/.packmind/recipes/my-recipe.md',
      );
    });

    it('deletes the lock file', async () => {
      (fs.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false,
      });

      await useCase.execute({ baseDirectory: '/test' });

      expect(fs.unlink).toHaveBeenCalledWith('/test/packmind-lock.json');
    });

    it('returns no errors', async () => {
      const result = await useCase.execute({ baseDirectory: '/test' });

      expect(result.errors).toHaveLength(0);
    });

    it('returns no missing access entries', async () => {
      const result = await useCase.execute({ baseDirectory: '/test' });

      expect(result.missingAccess).toHaveLength(0);
    });
  });

  describe('when explicit packages are provided without @ prefix', () => {
    describe('when organization has a single space', () => {
      const mySpace = spaceFactory({
        id: createSpaceId('space-1'),
        slug: 'my-space',
      });

      beforeEach(() => {
        mockSpaceService.getSpaces.mockResolvedValue([mySpace]);
        mockSpaceService.getDefaultSpace.mockResolvedValue(mySpace);
        mockSpaceService.getApiContext.mockReturnValue({
          host: 'https://app.packmind.com',
          organizationId: 'org-1',
        });
        mockConfigFileRepository.readConfig.mockResolvedValue(null);
      });

      it('normalizes the slug by prepending @space/', async () => {
        await useCase.execute({
          packages: ['my-package'],
          baseDirectory: '/test',
        });

        expect(mockGateway.deployment.install).toHaveBeenCalledWith(
          expect.objectContaining({
            packagesSlugs: expect.arrayContaining(['@my-space/my-package']),
          }),
        );
      });
    });

    describe('when organization has multiple spaces', () => {
      beforeEach(() => {
        mockSpaceService.getSpaces.mockResolvedValue([
          spaceFactory({ slug: 'space-a' }),
          spaceFactory({ slug: 'space-b' }),
        ]);
      });

      it('throws an error asking to specify the space', async () => {
        await expect(
          useCase.execute({ packages: ['my-package'], baseDirectory: '/test' }),
        ).rejects.toThrow(
          'Your organization has multiple spaces. Please specify the space for each package using the @space/package format',
        );
      });
    });
  });

  describe('when explicit packages are provided and user lacks access', () => {
    describe('when the package space is private', () => {
      beforeEach(() => {
        mockSpaceService.getSpaces.mockResolvedValue([
          spaceFactory({ slug: 'my-space' }),
        ]);
        mockSpaceService.getSpaceBySlug.mockResolvedValue(
          spaceFactory({ slug: 'other-space', type: SpaceType.private }),
        );
        mockSpaceService.getApiContext.mockReturnValue({
          host: 'https://app.packmind.com',
          organizationId: 'org-1',
        });
        mockConfigFileRepository.readConfig.mockResolvedValue(null);
      });

      it('throws an error saying the package does not exist', async () => {
        await expect(
          useCase.execute({
            packages: ['@other-space/secret-package'],
            baseDirectory: '/test',
          }),
        ).rejects.toThrow(
          'Package @other-space/secret-package does not exist.',
        );
      });
    });

    describe('when the package space is public', () => {
      beforeEach(() => {
        mockSpaceService.getSpaces.mockResolvedValue([
          spaceFactory({ slug: 'my-space' }),
        ]);
        mockSpaceService.getSpaceBySlug.mockResolvedValue(
          spaceFactory({ slug: 'public-space', type: SpaceType.open }),
        );
        mockSpaceService.getApiContext.mockReturnValue({
          host: 'https://app.packmind.com',
          organizationId: 'org-1',
        });
        mockGateway.organization.getOrganization.mockResolvedValue({
          id: createOrganizationId('org-1'),
          name: 'My Org',
          slug: 'my-org',
        });
        mockConfigFileRepository.readConfig.mockResolvedValue(null);
      });

      it('throws an error with a join URL', async () => {
        await expect(
          useCase.execute({
            packages: ['@public-space/some-package'],
            baseDirectory: '/test',
          }),
        ).rejects.toThrow(
          "You don't have access to space @public-space. It is a public space — you can join at: https://app.packmind.com/org/my-org/spaces/public-space/join",
        );
      });
    });
  });

  describe('when server returns missingAccess packages', () => {
    beforeEach(() => {
      mockGateway.deployment.install.mockResolvedValue(
        installResponseFactory({ missingAccess: ['@space/restricted-pkg'] }),
      );
    });

    it('includes missingAccess in the result', async () => {
      const result = await useCase.execute({ baseDirectory: '/test' });

      expect(result.missingAccess).toEqual(['@space/restricted-pkg']);
    });

    describe('when all missing packages belong to the same open space', () => {
      beforeEach(() => {
        mockGateway.deployment.install.mockResolvedValue(
          installResponseFactory({
            missingAccess: ['@open-space/pkg-a', '@open-space/pkg-b'],
          }),
        );
        mockSpaceService.getSpaceBySlug.mockResolvedValue(
          spaceFactory({ slug: 'open-space', type: SpaceType.open }),
        );
        mockSpaceService.getApiContext.mockReturnValue({
          host: 'https://app.packmind.com',
          organizationId: 'org-1',
        });
        mockGateway.organization.getOrganization.mockResolvedValue({
          id: createOrganizationId('org-1'),
          name: 'My Org',
          slug: 'my-org',
        });
      });

      it('includes a joinSpaceUrl in the result', async () => {
        const result = await useCase.execute({ baseDirectory: '/test' });

        expect(result.joinSpaceUrl).toBe(
          'https://app.packmind.com/org/my-org/spaces/open-space/join',
        );
      });
    });

    describe('when missing packages belong to multiple spaces', () => {
      beforeEach(() => {
        mockGateway.deployment.install.mockResolvedValue(
          installResponseFactory({
            missingAccess: ['@space-a/pkg-1', '@space-b/pkg-2'],
          }),
        );
      });

      it('does not include a joinSpaceUrl in the result', async () => {
        const result = await useCase.execute({ baseDirectory: '/test' });

        expect(result.joinSpaceUrl).toBeUndefined();
      });
    });

    describe('when missing packages belong to a single non-open space', () => {
      beforeEach(() => {
        mockGateway.deployment.install.mockResolvedValue(
          installResponseFactory({
            missingAccess: ['@private-space/secret-pkg'],
          }),
        );
        mockSpaceService.getSpaceBySlug.mockResolvedValue(
          spaceFactory({ slug: 'private-space', type: SpaceType.private }),
        );
      });

      it('does not include a joinSpaceUrl in the result', async () => {
        const result = await useCase.execute({ baseDirectory: '/test' });

        expect(result.joinSpaceUrl).toBeUndefined();
      });
    });
  });

  describe('when file does not exist', () => {
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      mockGateway.deployment.install.mockResolvedValue(
        installResponseFactory({
          createOrUpdate: [{ path: 'CLAUDE.md', content: '# New content' }],
        }),
      );
      (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

      result = await useCase.execute({ baseDirectory: '/test' });
    });

    it('writes new file with content', () => {
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/CLAUDE.md',
        '# New content',
        'utf-8',
      );
    });

    it('counts as file created', () => {
      expect(result.filesCreated).toBe(1);
    });

    it('does not count as file updated', () => {
      expect(result.filesUpdated).toBe(0);
    });
  });

  describe('when file exists without comment markers', () => {
    const newContent = '# Completely new content\n\nThis is new.';
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      mockGateway.deployment.install.mockResolvedValue(
        installResponseFactory({
          createOrUpdate: [{ path: 'CLAUDE.md', content: newContent }],
        }),
      );
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(
        '# Old content\n\nThis is old content.',
      );

      result = await useCase.execute({ baseDirectory: '/test' });
    });

    it('writes file with new content', () => {
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/CLAUDE.md',
        newContent,
        'utf-8',
      );
    });

    it('counts as file updated', () => {
      expect(result.filesUpdated).toBe(1);
    });

    it('does not count as file created', () => {
      expect(result.filesCreated).toBe(0);
    });
  });

  describe('when file exists with matching comment markers', () => {
    describe('when replacing a single marked section', () => {
      const newSectionContent = '## New Recipe\n- Step 1\n- Step 2';
      const contentWithMarkers = `<!-- start: Packmind recipes -->\n${newSectionContent}\n<!-- end: Packmind recipes -->`;
      const expectedContent = `# Project Documentation

Some introduction text.

<!-- start: Packmind recipes -->
${newSectionContent}
<!-- end: Packmind recipes -->

Some footer text.`;
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        mockGateway.deployment.install.mockResolvedValue(
          installResponseFactory({
            createOrUpdate: [
              { path: 'CLAUDE.md', content: contentWithMarkers },
            ],
          }),
        );
        (fs.access as jest.Mock).mockResolvedValue(undefined);
        (fs.readFile as jest.Mock).mockResolvedValue(`# Project Documentation

Some introduction text.

<!-- start: Packmind recipes -->
## Old Recipe
- Old step 1
- Old step 2
<!-- end: Packmind recipes -->

Some footer text.`);

        result = await useCase.execute({ baseDirectory: '/test' });
      });

      it('writes file with replaced section content', () => {
        expect(fs.writeFile).toHaveBeenCalledWith(
          '/test/CLAUDE.md',
          expectedContent,
          'utf-8',
        );
      });

      it('counts as file updated', () => {
        expect(result.filesUpdated).toBe(1);
      });

      it('does not count as file created', () => {
        expect(result.filesCreated).toBe(0);
      });
    });

    describe('when file has multiple sections with different markers', () => {
      const newStandardsContent = '- Standard A\n- Standard B';
      const contentWithMarkers = `<!-- start: Packmind standards -->\n${newStandardsContent}\n<!-- end: Packmind standards -->`;
      const expectedContent = `# Documentation

<!-- start: Packmind recipes -->
## Recipe content
<!-- end: Packmind recipes -->

<!-- start: Packmind standards -->
${newStandardsContent}
<!-- end: Packmind standards -->

Footer text.`;
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        mockGateway.deployment.install.mockResolvedValue(
          installResponseFactory({
            createOrUpdate: [
              { path: 'CLAUDE.md', content: contentWithMarkers },
            ],
          }),
        );
        (fs.access as jest.Mock).mockResolvedValue(undefined);
        (fs.readFile as jest.Mock).mockResolvedValue(`# Documentation

<!-- start: Packmind recipes -->
## Recipe content
<!-- end: Packmind recipes -->

<!-- start: Packmind standards -->
- Old standard 1
<!-- end: Packmind standards -->

Footer text.`);

        result = await useCase.execute({ baseDirectory: '/test' });
      });

      it('writes file with updated section while preserving other sections', () => {
        expect(fs.writeFile).toHaveBeenCalledWith(
          '/test/CLAUDE.md',
          expectedContent,
          'utf-8',
        );
      });

      it('counts as file updated', () => {
        expect(result.filesUpdated).toBe(1);
      });
    });
  });

  describe('when file exists but section does not exist yet', () => {
    const newSectionContent = '## New Recipe\n- Step 1';
    const contentWithMarkers = `<!-- start: Packmind recipes -->\n${newSectionContent}\n<!-- end: Packmind recipes -->`;
    const expectedContent = `# Project Documentation

Some existing content here.

<!-- start: Packmind standards -->
- Standard content
<!-- end: Packmind standards -->
<!-- start: Packmind recipes -->
${newSectionContent}
<!-- end: Packmind recipes -->`;
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      mockGateway.deployment.install.mockResolvedValue(
        installResponseFactory({
          createOrUpdate: [{ path: 'CLAUDE.md', content: contentWithMarkers }],
        }),
      );
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(`# Project Documentation

Some existing content here.

<!-- start: Packmind standards -->
- Standard content
<!-- end: Packmind standards -->`);

      result = await useCase.execute({ baseDirectory: '/test' });
    });

    it('writes file with appended section', () => {
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/CLAUDE.md',
        expectedContent,
        'utf-8',
      );
    });

    it('counts as file updated', () => {
      expect(result.filesUpdated).toBe(1);
    });
  });

  describe('when processing delete operations', () => {
    describe('when deleting an existing file', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        mockGateway.deployment.install.mockResolvedValue(
          installResponseFactory({
            delete: [{ path: 'old-file.md', type: DeleteItemType.File }],
          }),
        );
        (fs.stat as jest.Mock).mockResolvedValue({
          isDirectory: () => false,
          isFile: () => true,
        });

        result = await useCase.execute({ baseDirectory: '/test' });
      });

      it('calls unlink with correct path', () => {
        expect(fs.unlink).toHaveBeenCalledWith('/test/old-file.md');
      });

      it('counts as file deleted', () => {
        expect(result.filesDeleted).toBe(1);
      });
    });

    describe('when deleting an existing directory', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        mockGateway.deployment.install.mockResolvedValue(
          installResponseFactory({
            delete: [{ path: '.packmind', type: DeleteItemType.Directory }],
          }),
        );
        (fs.stat as jest.Mock).mockResolvedValue({
          isDirectory: () => true,
          isFile: () => false,
        });

        result = await useCase.execute({ baseDirectory: '/test' });
      });

      it('calls rm with recursive and force options', () => {
        expect(fs.rm).toHaveBeenCalledWith('/test/.packmind', {
          recursive: true,
          force: true,
        });
      });

      it('does not call unlink', () => {
        expect(fs.unlink).not.toHaveBeenCalled();
      });

      it('counts as file deleted', () => {
        expect(result.filesDeleted).toBe(1);
      });
    });

    describe('when file to delete does not exist', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        mockGateway.deployment.install.mockResolvedValue(
          installResponseFactory({
            delete: [{ path: 'non-existent.md', type: DeleteItemType.File }],
          }),
        );
        (fs.stat as jest.Mock).mockResolvedValue(null);

        result = await useCase.execute({ baseDirectory: '/test' });
      });

      it('does not call unlink', () => {
        expect(fs.unlink).not.toHaveBeenCalled();
      });

      it('does not call rm', () => {
        expect(fs.rm).not.toHaveBeenCalled();
      });

      it('does not count as file deleted', () => {
        expect(result.filesDeleted).toBe(0);
      });

      it('does not add errors', () => {
        expect(result.errors).toEqual([]);
      });
    });
  });

  describe('error handling', () => {
    describe('when file operation fails', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        mockGateway.deployment.install.mockResolvedValue(
          installResponseFactory({
            createOrUpdate: [{ path: 'CLAUDE.md', content: 'content' }],
          }),
        );
        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));
        (fs.writeFile as jest.Mock).mockRejectedValue(
          new Error('Permission denied'),
        );

        result = await useCase.execute({ baseDirectory: '/test' });
      });

      it('captures one error', () => {
        expect(result.errors).toHaveLength(1);
      });

      it('includes file path in error message', () => {
        expect(result.errors[0]).toContain('Failed to create/update CLAUDE.md');
      });

      it('includes original error message', () => {
        expect(result.errors[0]).toContain('Permission denied');
      });
    });
  });

  describe('when file content has not changed', () => {
    describe('with full content replacement', () => {
      const content = '# Unchanged content\n\nThis is the same.';

      beforeEach(() => {
        mockGateway.deployment.install.mockResolvedValue(
          installResponseFactory({
            createOrUpdate: [{ path: 'CLAUDE.md', content }],
          }),
        );
        (fs.access as jest.Mock).mockResolvedValue(undefined);
        (fs.readFile as jest.Mock).mockResolvedValue(content);
      });

      it('does not write to file', async () => {
        await useCase.execute({ baseDirectory: '/test' });

        expect(fs.writeFile).not.toHaveBeenCalled();
      });

      it('does not count as updated', async () => {
        const result = await useCase.execute({ baseDirectory: '/test' });

        expect(result.filesUpdated).toBe(0);
      });
    });

    describe('with sections-based update and identical content', () => {
      const existingContent = `# Documentation

<!-- start: test-section -->
Section content here
<!-- end: test-section -->`;

      beforeEach(() => {
        mockGateway.deployment.install.mockResolvedValue(
          installResponseFactory({
            createOrUpdate: [
              {
                path: 'CLAUDE.md',
                sections: [
                  { key: 'test-section', content: 'Section content here' },
                ],
              },
            ],
          }),
        );
        (fs.access as jest.Mock).mockResolvedValue(undefined);
        (fs.readFile as jest.Mock).mockResolvedValue(existingContent);
      });

      it('does not write to file', async () => {
        await useCase.execute({ baseDirectory: '/test' });

        expect(fs.writeFile).not.toHaveBeenCalled();
      });

      it('does not count as updated', async () => {
        const result = await useCase.execute({ baseDirectory: '/test' });

        expect(result.filesUpdated).toBe(0);
      });
    });
  });

  describe('when file has isBase64 flag', () => {
    const base64Content = Buffer.from('binary content here').toString('base64');

    beforeEach(() => {
      mockGateway.deployment.install.mockResolvedValue(
        installResponseFactory({
          createOrUpdate: [
            { path: 'images/logo.png', content: base64Content, isBase64: true },
          ],
        }),
      );
    });

    describe('when file does not exist', () => {
      beforeEach(() => {
        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));
      });

      it('decodes base64 content and writes as binary', async () => {
        await useCase.execute({ baseDirectory: '/test' });

        expect(fs.writeFile).toHaveBeenCalledWith(
          '/test/images/logo.png',
          Buffer.from(base64Content, 'base64'),
        );
      });

      it('counts as file created', async () => {
        const result = await useCase.execute({ baseDirectory: '/test' });

        expect(result.filesCreated).toBe(1);
      });
    });

    describe('when file already exists', () => {
      beforeEach(() => {
        (fs.access as jest.Mock).mockResolvedValue(undefined);
      });

      it('decodes base64 content and writes as binary', async () => {
        await useCase.execute({ baseDirectory: '/test' });

        expect(fs.writeFile).toHaveBeenCalledWith(
          '/test/images/logo.png',
          Buffer.from(base64Content, 'base64'),
        );
      });

      it('counts as file updated', async () => {
        const result = await useCase.execute({ baseDirectory: '/test' });

        expect(result.filesUpdated).toBe(1);
      });
    });
  });

  describe('when section merge results in empty content', () => {
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      mockGateway.deployment.install.mockResolvedValue(
        installResponseFactory({
          createOrUpdate: [
            {
              path: '.cursor/rules/config.mdc',
              sections: [{ key: 'packmind-section', content: '' }],
            },
          ],
        }),
      );
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock)
        .mockResolvedValue(`<!-- start: packmind-section -->
Old packmind content
<!-- end: packmind-section -->`);

      result = await useCase.execute({ baseDirectory: '/test' });
    });

    it('calls unlink to delete the file', () => {
      expect(fs.unlink).toHaveBeenCalledWith('/test/.cursor/rules/config.mdc');
    });

    it('counts as file deleted', () => {
      expect(result.filesDeleted).toBe(1);
    });

    it('does not count as file updated', () => {
      expect(result.filesUpdated).toBe(0);
    });
  });

  describe('artifact counting', () => {
    beforeEach(() => {
      mockGateway.deployment.install.mockResolvedValue(
        installResponseFactory({
          createOrUpdate: [
            { path: '.packmind/recipes/recipe-1.md', content: '# Recipe 1' },
            { path: '.packmind/recipes/recipe-2.md', content: '# Recipe 2' },
            {
              path: '.packmind/standards/standard-1.md',
              content: '# Standard 1',
            },
            {
              path: '.packmind/commands/command-1.md',
              content: '# Command 1',
            },
            { path: '.packmind/skills/skill-1.md', content: '# Skill 1' },
            { path: 'packmind.json', content: '{}' },
            { path: 'some-other-file.txt', content: 'content' },
          ],
        }),
      );
      (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));
    });

    it('counts recipes correctly', async () => {
      const result = await useCase.execute({ baseDirectory: '/test' });

      expect(result.recipesCount).toBe(2);
    });

    it('counts standards correctly', async () => {
      const result = await useCase.execute({ baseDirectory: '/test' });

      expect(result.standardsCount).toBe(1);
    });

    it('counts commands correctly', async () => {
      const result = await useCase.execute({ baseDirectory: '/test' });

      expect(result.commandsCount).toBe(1);
    });

    it('counts skills correctly', async () => {
      const result = await useCase.execute({ baseDirectory: '/test' });

      expect(result.skillsCount).toBe(1);
    });

    it('does not write packmind.json (filtered from server response)', async () => {
      await useCase.execute({ baseDirectory: '/test' });

      const writeCalls = (fs.writeFile as jest.Mock).mock.calls.map(
        ([path]: [string]) => path,
      );
      expect(writeCalls).not.toContain('/test/packmind.json');
    });
  });

  describe('when explicit packages are provided alongside existing config packages', () => {
    const mySpace = spaceFactory({ slug: 'my-space' });

    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue(null);
      mockSpaceService.getSpaces.mockResolvedValue([mySpace]);
      mockSpaceService.getApiContext.mockReturnValue({
        host: 'https://app.packmind.com',
        organizationId: 'org-1',
      });
      mockConfigFileRepository.readConfig.mockResolvedValue({
        packages: { '@my-space/existing-package': '' },
      });
    });

    it('merges config packages with explicit packages (deduplicating)', async () => {
      await useCase.execute({
        packages: ['@my-space/new-package'],
        baseDirectory: '/test',
      });

      expect(mockGateway.deployment.install).toHaveBeenCalledWith(
        expect.objectContaining({
          packagesSlugs: expect.arrayContaining([
            '@my-space/existing-package',
            '@my-space/new-package',
          ]),
        }),
      );
    });
  });
});
