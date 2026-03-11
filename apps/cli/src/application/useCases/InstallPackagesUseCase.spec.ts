import * as fs from 'fs/promises';

import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ILockFileRepository } from '../../domain/repositories/ILockFileRepository';
import { InstallPackagesUseCase } from './InstallPackagesUseCase';
import { DeleteItemType } from '@packmind/types';
import { createMockLockFileRepository } from '../../mocks/createMockRepositories';
jest.mock('fs/promises');

describe('InstallPackagesUseCase', () => {
  let useCase: InstallPackagesUseCase;
  let mockGateway: jest.Mocked<IPackmindGateway>;
  let mockLockFileRepository: jest.Mocked<ILockFileRepository>;

  beforeEach(() => {
    mockGateway = {
      deployment: {
        pull: jest.fn(),
        notifyDistribution: jest.fn(),
      },
      packages: {
        list: jest.fn(),
        getSummary: jest.fn(),
        create: jest.fn(),
      },
    } as unknown as jest.Mocked<IPackmindGateway>;

    mockLockFileRepository = createMockLockFileRepository();

    // Setup fs mocks using jest.Mock casting
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

    useCase = new InstallPackagesUseCase(mockGateway, mockLockFileRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when file does not exist', () => {
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      mockGateway.deployment.pull.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: 'CLAUDE.md',
              content: '# New content',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      // File does not exist
      (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

      result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });
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
      mockGateway.deployment.pull.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: 'CLAUDE.md',
              content: newContent,
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      // File exists
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      // Existing file content without comment markers
      const existingContent = '# Old content\n\nThis is old content.';
      (fs.readFile as jest.Mock).mockResolvedValue(existingContent);

      result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });
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
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: 'CLAUDE.md',
                content: contentWithMarkers,
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });

        // File exists
        (fs.access as jest.Mock).mockResolvedValue(undefined);

        // Existing file with same markers but different content
        const existingContent = `# Project Documentation

Some introduction text.

<!-- start: Packmind recipes -->
## Old Recipe
- Old step 1
- Old step 2
<!-- end: Packmind recipes -->

Some footer text.`;

        (fs.readFile as jest.Mock).mockResolvedValue(existingContent);

        result = await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });
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
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: 'CLAUDE.md',
                content: contentWithMarkers,
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });

        // File exists
        (fs.access as jest.Mock).mockResolvedValue(undefined);

        // Existing file with multiple sections
        const existingContent = `# Documentation

<!-- start: Packmind recipes -->
## Recipe content
<!-- end: Packmind recipes -->

<!-- start: Packmind standards -->
- Old standard 1
<!-- end: Packmind standards -->

Footer text.`;

        (fs.readFile as jest.Mock).mockResolvedValue(existingContent);

        result = await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });
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
      mockGateway.deployment.pull.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: 'CLAUDE.md',
              content: contentWithMarkers,
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      // File exists
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      // Existing file without the recipes section
      const existingContent = `# Project Documentation

Some existing content here.

<!-- start: Packmind standards -->
- Standard content
<!-- end: Packmind standards -->`;

      (fs.readFile as jest.Mock).mockResolvedValue(existingContent);

      result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });
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
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [],
            delete: [
              {
                path: 'old-file.md',
                type: DeleteItemType.File,
              },
            ],
          },
          skillFolders: [],
        });

        // File exists and is a file
        (fs.stat as jest.Mock).mockResolvedValue({
          isDirectory: () => false,
          isFile: () => true,
        });

        result = await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });
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
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [],
            delete: [
              {
                path: '.packmind',
                type: DeleteItemType.Directory,
              },
            ],
          },
          skillFolders: [],
        });

        // Path exists and is a directory
        (fs.stat as jest.Mock).mockResolvedValue({
          isDirectory: () => true,
          isFile: () => false,
        });

        result = await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });
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
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [],
            delete: [
              {
                path: 'non-existent.md',
                type: DeleteItemType.File,
              },
            ],
          },
          skillFolders: [],
        });

        // stat returns null when file does not exist (caught error)
        (fs.stat as jest.Mock).mockResolvedValue(null);

        result = await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });
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
      beforeEach(() => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: 'CLAUDE.md',
                content: 'content',
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });

        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));
        (fs.writeFile as jest.Mock).mockRejectedValue(
          new Error('Permission denied'),
        );
      });

      describe('when operation is executed', () => {
        let result: Awaited<ReturnType<typeof useCase.execute>>;

        beforeEach(async () => {
          result = await useCase.execute({
            packagesSlugs: ['test-package'],
            baseDirectory: '/test',
          });
        });

        it('captures one error', () => {
          expect(result.errors).toHaveLength(1);
        });

        it('includes file path in error message', () => {
          expect(result.errors[0]).toContain(
            'Failed to create/update CLAUDE.md',
          );
        });

        it('includes original error message', () => {
          expect(result.errors[0]).toContain('Permission denied');
        });
      });
    });
  });

  describe('when file content has not changed', () => {
    describe('with full content replacement', () => {
      const content = '# Unchanged content\n\nThis is the same.';

      beforeEach(() => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: 'CLAUDE.md',
                content,
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });

        // File exists
        (fs.access as jest.Mock).mockResolvedValue(undefined);
        // Existing file has identical content
        (fs.readFile as jest.Mock).mockResolvedValue(content);
      });

      it('does not write to file', async () => {
        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(fs.writeFile).not.toHaveBeenCalled();
      });

      it('does not count as updated', async () => {
        const result = await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(result.filesUpdated).toBe(0);
      });
    });

    describe('with section markers and identical section content', () => {
      const sectionContent = '## Recipe\n- Step 1\n- Step 2';
      const existingContent = `# Documentation

<!-- start: Packmind recipes -->
${sectionContent}
<!-- end: Packmind recipes -->

Footer text.`;
      const newContentWithMarkers = `<!-- start: Packmind recipes -->
${sectionContent}
<!-- end: Packmind recipes -->`;

      beforeEach(() => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: 'CLAUDE.md',
                content: newContentWithMarkers,
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });

        // File exists
        (fs.access as jest.Mock).mockResolvedValue(undefined);
        // Existing file has identical section content
        (fs.readFile as jest.Mock).mockResolvedValue(existingContent);
      });

      it('does not write to file', async () => {
        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(fs.writeFile).not.toHaveBeenCalled();
      });

      it('does not count as updated', async () => {
        const result = await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(result.filesUpdated).toBe(0);
      });
    });

    describe('with sections-based update and identical content', () => {
      const existingContent = `# Documentation

<!-- start: test-section -->
Section content here
<!-- end: test-section -->`;

      beforeEach(() => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: 'CLAUDE.md',
                sections: [
                  {
                    key: 'test-section',
                    content: 'Section content here',
                  },
                ],
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });

        // File exists
        (fs.access as jest.Mock).mockResolvedValue(undefined);
        // Existing file has identical section content
        (fs.readFile as jest.Mock).mockResolvedValue(existingContent);
      });

      it('does not write to file', async () => {
        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(fs.writeFile).not.toHaveBeenCalled();
      });

      it('does not count as updated', async () => {
        const result = await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(result.filesUpdated).toBe(0);
      });
    });
  });

  describe('when file has isBase64 flag', () => {
    describe('when isBase64 is true', () => {
      const base64Content = Buffer.from('binary content here').toString(
        'base64',
      );

      beforeEach(() => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: 'images/logo.png',
                content: base64Content,
                isBase64: true,
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });
      });

      describe('when file does not exist', () => {
        beforeEach(() => {
          (fs.access as jest.Mock).mockRejectedValue(
            new Error('File not found'),
          );
        });

        it('decodes base64 content and writes as binary', async () => {
          await useCase.execute({
            packagesSlugs: ['test-package'],
            baseDirectory: '/test',
          });

          expect(fs.writeFile).toHaveBeenCalledWith(
            '/test/images/logo.png',
            Buffer.from(base64Content, 'base64'),
          );
        });

        it('counts as file created', async () => {
          const result = await useCase.execute({
            packagesSlugs: ['test-package'],
            baseDirectory: '/test',
          });

          expect(result.filesCreated).toBe(1);
        });
      });

      describe('when file already exists', () => {
        beforeEach(() => {
          (fs.access as jest.Mock).mockResolvedValue(undefined);
        });

        it('decodes base64 content and writes as binary', async () => {
          await useCase.execute({
            packagesSlugs: ['test-package'],
            baseDirectory: '/test',
          });

          expect(fs.writeFile).toHaveBeenCalledWith(
            '/test/images/logo.png',
            Buffer.from(base64Content, 'base64'),
          );
        });

        it('counts as file updated', async () => {
          const result = await useCase.execute({
            packagesSlugs: ['test-package'],
            baseDirectory: '/test',
          });

          expect(result.filesUpdated).toBe(1);
        });
      });
    });

    describe('when isBase64 is false', () => {
      const textContent = '# Text content';

      beforeEach(() => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: 'README.md',
                content: textContent,
                isBase64: false,
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });

        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));
      });

      it('writes content as UTF-8 text', async () => {
        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(fs.writeFile).toHaveBeenCalledWith(
          '/test/README.md',
          textContent,
          'utf-8',
        );
      });
    });

    describe('when isBase64 is undefined', () => {
      const textContent = '# Text content';

      beforeEach(() => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: 'README.md',
                content: textContent,
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });

        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));
      });

      it('writes content as UTF-8 text', async () => {
        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(fs.writeFile).toHaveBeenCalledWith(
          '/test/README.md',
          textContent,
          'utf-8',
        );
      });
    });
  });

  describe('when section merge results in empty content', () => {
    describe('when content becomes empty after section merge', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.cursor/rules/config.mdc',
                sections: [
                  {
                    key: 'packmind-section',
                    content: '', // Empty content clears the section
                  },
                ],
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });

        // File exists
        (fs.access as jest.Mock).mockResolvedValue(undefined);

        // Existing file has only the packmind section (no user content)
        const existingContent = `<!-- start: packmind-section -->
Old packmind content
<!-- end: packmind-section -->`;
        (fs.readFile as jest.Mock).mockResolvedValue(existingContent);

        result = await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });
      });

      it('calls unlink to delete the file', () => {
        expect(fs.unlink).toHaveBeenCalledWith(
          '/test/.cursor/rules/config.mdc',
        );
      });

      it('does not call writeFile', () => {
        expect(fs.writeFile).not.toHaveBeenCalled();
      });

      it('counts as file deleted', () => {
        expect(result.filesDeleted).toBe(1);
      });

      it('does not count as file updated', () => {
        expect(result.filesUpdated).toBe(0);
      });
    });

    describe('when file has user content after section merge', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.cursor/rules/config.mdc',
                sections: [
                  {
                    key: 'packmind-section',
                    content: '', // Empty content clears the section
                  },
                ],
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });

        // File exists
        (fs.access as jest.Mock).mockResolvedValue(undefined);

        // Existing file has user content plus the packmind section
        const existingContent = `# User custom rules

Some user-defined content here.

<!-- start: packmind-section -->
Old packmind content
<!-- end: packmind-section -->`;
        (fs.readFile as jest.Mock).mockResolvedValue(existingContent);

        result = await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });
      });

      it('does not call unlink', () => {
        expect(fs.unlink).not.toHaveBeenCalled();
      });

      it('calls writeFile to update the file', () => {
        expect(fs.writeFile).toHaveBeenCalled();
      });

      it('counts as file updated', () => {
        expect(result.filesUpdated).toBe(1);
      });

      it('does not count as file deleted', () => {
        expect(result.filesDeleted).toBe(0);
      });
    });
  });

  describe('when skills are installed', () => {
    beforeEach(() => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));
    });

    describe('when skill files are present in package', () => {
      beforeEach(() => {
        // Mock fs.access to resolve for skill folders (folders exist)
        (fs.access as jest.Mock).mockImplementation((path: string) => {
          if (path.includes('/skills/')) {
            return Promise.resolve();
          }
          return Promise.reject(new Error('File not found'));
        });

        // Mock fs.readdir to return 2 files per skill folder
        (fs.readdir as jest.Mock).mockResolvedValue([
          { name: 'SKILL.md', isDirectory: () => false },
          { name: 'helper.ts', isDirectory: () => false },
        ]);

        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.packmind/skills/signal-capture/SKILL.md',
                content: '# Signal Capture Skill',
              },
              {
                path: '.packmind/skills/signal-capture/helper.ts',
                content: 'export {}',
              },
            ],
            delete: [],
          },
          skillFolders: [
            '.packmind/skills/signal-capture',
            '.claude/skills/signal-capture',
            '.github/skills/signal-capture',
          ],
        });
      });

      it('counts skill files correctly', async () => {
        const result = await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(result.skillsCount).toBe(1);
      });

      it('counts deleted files across all skill directories', async () => {
        const result = await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        // 3 folders x 2 files each = 6 files deleted
        expect(result.skillDirectoriesDeleted).toBe(6);
      });

      it('removes .packmind/skills folder', async () => {
        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(fs.rm).toHaveBeenCalledWith(
          '/test/.packmind/skills/signal-capture',
          { recursive: true, force: true },
        );
      });

      it('removes .claude/skills folder', async () => {
        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(fs.rm).toHaveBeenCalledWith(
          '/test/.claude/skills/signal-capture',
          { recursive: true, force: true },
        );
      });

      it('removes .github/skills folder', async () => {
        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(fs.rm).toHaveBeenCalledWith(
          '/test/.github/skills/signal-capture',
          { recursive: true, force: true },
        );
      });
    });

    describe('when skillFolders array is empty', () => {
      beforeEach(() => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.packmind/skills/missing-skill/SKILL.md',
                content: '# Missing Skill',
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });
      });

      it('does not delete any directories', async () => {
        const result = await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(result.skillDirectoriesDeleted).toBe(0);
      });
    });

    describe('when delete fails for some folders', () => {
      beforeEach(() => {
        // Mock fs.access to resolve for skill folders (folders exist)
        (fs.access as jest.Mock).mockImplementation((path: string) => {
          if (path.includes('/skills/')) {
            return Promise.resolve();
          }
          return Promise.reject(new Error('File not found'));
        });

        // Mock fs.readdir to return 2 files per skill folder
        (fs.readdir as jest.Mock).mockResolvedValue([
          { name: 'SKILL.md', isDirectory: () => false },
          { name: 'helper.ts', isDirectory: () => false },
        ]);

        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [],
            delete: [],
          },
          skillFolders: [
            '.claude/skills/test-skill',
            '.github/skills/test-skill',
          ],
        });

        // First call succeeds, second fails
        (fs.rm as jest.Mock)
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('Permission denied'));
      });

      it('counts only files from successful deletions', async () => {
        const result = await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        // Only 1 folder deleted successfully x 2 files = 2 files deleted
        expect(result.skillDirectoriesDeleted).toBe(2);
      });

      it('does not add errors for failed deletions', async () => {
        const result = await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(result.errors).toEqual([]);
      });
    });
  });

  describe('empty folder cleanup', () => {
    describe('when deleting a file leaves parent directory empty', () => {
      beforeEach(() => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [],
            delete: [
              {
                path: '.packmind/recipes/old-recipe.md',
                type: DeleteItemType.File,
              },
            ],
          },
          skillFolders: [],
        });

        // File exists and is a file
        (fs.stat as jest.Mock).mockResolvedValue({
          isDirectory: () => false,
          isFile: () => true,
        });

        // Parent directory is empty after deletion
        (fs.readdir as jest.Mock).mockResolvedValue([]);
      });

      it('removes immediate empty parent directory', async () => {
        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(fs.rmdir).toHaveBeenCalledWith('/test/.packmind/recipes');
      });

      it('removes empty grandparent directory recursively', async () => {
        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(fs.rmdir).toHaveBeenCalledWith('/test/.packmind');
      });
    });

    describe('when parent directory is not empty after deletion', () => {
      beforeEach(() => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [],
            delete: [
              {
                path: '.packmind/recipes/old-recipe.md',
                type: DeleteItemType.File,
              },
            ],
          },
          skillFolders: [],
        });

        // File exists and is a file
        (fs.stat as jest.Mock).mockResolvedValue({
          isDirectory: () => false,
          isFile: () => true,
        });

        // Parent directory still has files
        (fs.readdir as jest.Mock).mockResolvedValue(['other-recipe.md']);
      });

      it('does not remove parent directory', async () => {
        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(fs.rmdir).not.toHaveBeenCalled();
      });
    });

    describe('when section merge results in empty file', () => {
      beforeEach(() => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.claude/rules/config.mdc',
                sections: [
                  {
                    key: 'packmind-section',
                    content: '',
                  },
                ],
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });

        // File exists
        (fs.access as jest.Mock).mockResolvedValue(undefined);

        // Existing file has only the packmind section
        const existingContent = `<!-- start: packmind-section -->
Old packmind content
<!-- end: packmind-section -->`;
        (fs.readFile as jest.Mock).mockResolvedValue(existingContent);

        // Parent directory is empty after deletion
        (fs.readdir as jest.Mock).mockResolvedValue([]);
      });

      it('removes empty parent directories after deleting empty file', async () => {
        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(fs.rmdir).toHaveBeenCalledWith('/test/.claude/rules');
      });
    });

    describe('when skill folder deletion leaves parent empty', () => {
      beforeEach(() => {
        // Mock fs.access to resolve for skill folders (folders exist)
        (fs.access as jest.Mock).mockImplementation((path: string) => {
          if (path.includes('/skills/')) {
            return Promise.resolve();
          }
          return Promise.reject(new Error('File not found'));
        });

        // Mock fs.readdir to return files for skill folder, then empty for parent
        (fs.readdir as jest.Mock).mockImplementation((path: string) => {
          if (path.includes('signal-capture')) {
            return Promise.resolve([
              { name: 'SKILL.md', isDirectory: () => false },
            ]);
          }
          // Parent directories are empty after skill folder deletion
          return Promise.resolve([]);
        });

        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [],
            delete: [],
          },
          skillFolders: ['.packmind/skills/signal-capture'],
        });
      });

      it('removes empty parent directories after skill folder deletion', async () => {
        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(fs.rmdir).toHaveBeenCalledWith('/test/.packmind/skills');
      });
    });

    describe('when cleanup should not exceed base directory', () => {
      beforeEach(() => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [],
            delete: [
              {
                path: 'single-file.md',
                type: DeleteItemType.File,
              },
            ],
          },
          skillFolders: [],
        });

        // File exists and is a file
        (fs.stat as jest.Mock).mockResolvedValue({
          isDirectory: () => false,
          isFile: () => true,
        });

        // Parent directory (base directory) would be empty
        (fs.readdir as jest.Mock).mockResolvedValue([]);
      });

      it('does not remove base directory', async () => {
        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(fs.rmdir).not.toHaveBeenCalledWith('/test');
      });
    });

    describe('when rmdir fails', () => {
      beforeEach(() => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [],
            delete: [
              {
                path: '.packmind/recipes/old-recipe.md',
                type: DeleteItemType.File,
              },
            ],
          },
          skillFolders: [],
        });

        // File exists and is a file
        (fs.stat as jest.Mock).mockResolvedValue({
          isDirectory: () => false,
          isFile: () => true,
        });

        // Parent directory is empty
        (fs.readdir as jest.Mock).mockResolvedValue([]);

        // rmdir fails
        (fs.rmdir as jest.Mock).mockRejectedValue(
          new Error('Permission denied'),
        );
      });

      it('does not throw error', async () => {
        const result = await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(result.errors).toEqual([]);
      });

      it('still counts file as deleted', async () => {
        const result = await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(result.filesDeleted).toBe(1);
      });
    });
  });

  describe('when file has skillFilePermissions', () => {
    const originalPlatform = process.platform;

    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    describe('when permissions are provided on Unix', () => {
      beforeEach(() => {
        Object.defineProperty(process, 'platform', { value: 'linux' });

        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.claude/skills/my-skill/script.sh',
                content: '#!/bin/bash',
                skillFilePermissions: 'rwxr-xr-x',
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });

        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));
      });

      it('calls chmod with correct octal mode', async () => {
        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(fs.chmod).toHaveBeenCalledWith(
          '/test/.claude/skills/my-skill/script.sh',
          0o755,
        );
      });
    });

    describe('when permissions are provided on Windows', () => {
      beforeEach(() => {
        Object.defineProperty(process, 'platform', { value: 'win32' });

        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.claude/skills/my-skill/script.sh',
                content: '#!/bin/bash',
                skillFilePermissions: 'rwxr-xr-x',
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });

        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));
      });

      it('does not call chmod', async () => {
        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(fs.chmod).not.toHaveBeenCalled();
      });
    });

    describe('when permissions are not provided', () => {
      beforeEach(() => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.claude/skills/my-skill/helper.ts',
                content: 'export {}',
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });

        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));
      });

      it('does not call chmod', async () => {
        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(fs.chmod).not.toHaveBeenCalled();
      });
    });
  });

  describe('lock file generation', () => {
    describe('when artifacts have metadata', () => {
      beforeEach(async () => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.packmind/standards/coding-style.md',
                content: '# Coding Style',
                artifactType: 'standard',
                artifactName: 'Coding Style',
                artifactSlug: 'coding-style',
                artifactId: 'artifact-1',
                artifactVersion: 3,
                spaceId: 'space-1',
              },
              {
                path: '.packmind/commands/setup-lint.md',
                content: '# Setup Lint',
                artifactType: 'command',
                artifactName: 'Setup Lint',
                artifactSlug: 'setup-lint',
                artifactId: 'artifact-2',
                artifactVersion: 1,
                spaceId: 'space-1',
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });

        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
          agents: ['packmind'],
        });
      });

      it('writes lock file with correct metadata and file paths', () => {
        expect(mockLockFileRepository.write).toHaveBeenCalledWith('/test', {
          lockfileVersion: 1,
          packageSlugs: ['test-package'],
          agents: ['packmind'],
          installedAt: expect.any(String),
          cliVersion: 'unknown',
          artifacts: {
            'coding-style': {
              type: 'standard',
              name: 'Coding Style',
              id: 'artifact-1',
              version: 3,
              spaceId: 'space-1',
              files: [
                {
                  path: '.packmind/standards/coding-style.md',
                  agent: 'packmind',
                },
              ],
            },
            'setup-lint': {
              type: 'command',
              name: 'Setup Lint',
              id: 'artifact-2',
              version: 1,
              spaceId: 'space-1',
              files: [
                {
                  path: '.packmind/commands/setup-lint.md',
                  agent: 'packmind',
                },
              ],
            },
          },
        });
      });
    });

    describe('when artifacts are duplicated across agents', () => {
      beforeEach(async () => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.claude/rules/coding-style.md',
                content: '# Coding Style for Claude',
                artifactType: 'standard',
                artifactName: 'Coding Style',
                artifactSlug: 'coding-style',
                artifactId: 'artifact-1',
                artifactVersion: 2,
                spaceId: 'space-1',
              },
              {
                path: '.cursor/rules/coding-style.md',
                content: '# Coding Style for Cursor',
                artifactType: 'standard',
                artifactName: 'Coding Style',
                artifactSlug: 'coding-style',
                artifactId: 'artifact-1',
                artifactVersion: 2,
                spaceId: 'space-1',
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });

        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
          agents: ['claude', 'cursor'],
        });
      });

      it('groups files from multiple agents under a single artifact entry', () => {
        expect(mockLockFileRepository.write).toHaveBeenCalledWith('/test', {
          lockfileVersion: 1,
          packageSlugs: ['test-package'],
          agents: ['claude', 'cursor'],
          installedAt: expect.any(String),
          cliVersion: 'unknown',
          artifacts: {
            'coding-style': {
              type: 'standard',
              name: 'Coding Style',
              id: 'artifact-1',
              version: 2,
              spaceId: 'space-1',
              files: [
                {
                  path: '.claude/rules/coding-style.md',
                  agent: 'claude',
                },
                {
                  path: '.cursor/rules/coding-style.md',
                  agent: 'cursor',
                },
              ],
            },
          },
        });
      });
    });

    describe('when no artifacts have metadata', () => {
      beforeEach(async () => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: 'CLAUDE.md',
                content: '# Project docs',
              },
              {
                path: '.cursor/rules/config.mdc',
                sections: [{ key: 'test-section', content: 'content' }],
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });

        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });
      });

      it('does not write lock file', () => {
        expect(mockLockFileRepository.write).not.toHaveBeenCalled();
      });

      it('deletes stale lock file', () => {
        expect(mockLockFileRepository.delete).toHaveBeenCalledWith('/test');
      });
    });

    describe('when some artifacts have partial metadata', () => {
      beforeEach(async () => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.packmind/standards/complete.md',
                content: '# Complete',
                artifactType: 'standard',
                artifactName: 'Complete Standard',
                artifactSlug: 'complete',
                artifactId: 'artifact-1',
                artifactVersion: 1,
                spaceId: 'space-1',
              },
              {
                path: '.packmind/standards/partial.md',
                content: '# Partial',
                artifactType: 'standard',
                artifactName: 'Partial Standard',
                // missing artifactSlug, artifactId, artifactVersion, spaceId
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });

        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
          agents: ['packmind'],
        });
      });

      it('only includes artifacts with complete metadata', () => {
        expect(mockLockFileRepository.write).toHaveBeenCalledWith('/test', {
          lockfileVersion: 1,
          packageSlugs: ['test-package'],
          agents: ['packmind'],
          installedAt: expect.any(String),
          cliVersion: 'unknown',
          artifacts: {
            complete: {
              type: 'standard',
              name: 'Complete Standard',
              id: 'artifact-1',
              version: 1,
              spaceId: 'space-1',
              files: [
                {
                  path: '.packmind/standards/complete.md',
                  agent: 'packmind',
                },
              ],
            },
          },
        });
      });
    });

    describe('when agents are provided', () => {
      beforeEach(async () => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.packmind/standards/coding-style.md',
                content: '# Coding Style',
                artifactType: 'standard',
                artifactName: 'Coding Style',
                artifactSlug: 'coding-style',
                artifactId: 'artifact-1',
                artifactVersion: 1,
                spaceId: 'space-1',
              },
            ],
            delete: [],
          },
          skillFolders: [],
          resolvedAgents: ['claude', 'cursor', 'packmind'],
        });

        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
          agents: ['claude', 'cursor', 'packmind'],
        });
      });

      it('uses provided agents in lock file', () => {
        expect(mockLockFileRepository.write).toHaveBeenCalledWith(
          '/test',
          expect.objectContaining({
            agents: ['claude', 'cursor', 'packmind'],
          }),
        );
      });
    });

    describe('when command.agents is undefined and server returns resolvedAgents', () => {
      beforeEach(async () => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.packmind/standards/coding-style.md',
                content: '# Coding Style',
                artifactType: 'standard',
                artifactName: 'Coding Style',
                artifactSlug: 'coding-style',
                artifactId: 'artifact-1',
                artifactVersion: 1,
                spaceId: 'space-1',
              },
            ],
            delete: [],
          },
          skillFolders: [],
          resolvedAgents: ['claude', 'cursor', 'packmind'],
        });

        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });
      });

      it('uses server-resolved agents in lock file', () => {
        expect(mockLockFileRepository.write).toHaveBeenCalledWith(
          '/test',
          expect.objectContaining({
            agents: ['claude', 'cursor', 'packmind'],
          }),
        );
      });
    });

    describe('when command.agents is defined and server returns resolvedAgents', () => {
      beforeEach(async () => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.packmind/standards/coding-style.md',
                content: '# Coding Style',
                artifactType: 'standard',
                artifactName: 'Coding Style',
                artifactSlug: 'coding-style',
                artifactId: 'artifact-1',
                artifactVersion: 1,
                spaceId: 'space-1',
              },
            ],
            delete: [],
          },
          skillFolders: [],
          resolvedAgents: ['claude', 'cursor', 'packmind'],
        });

        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
          agents: ['claude'],
        });
      });

      it('uses command agents regardless of resolvedAgents', () => {
        expect(mockLockFileRepository.write).toHaveBeenCalledWith(
          '/test',
          expect.objectContaining({
            agents: ['claude'],
          }),
        );
      });
    });

    describe('when command.agents is empty array and server returns resolvedAgents', () => {
      beforeEach(async () => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.packmind/standards/coding-style.md',
                content: '# Coding Style',
                artifactType: 'standard',
                artifactName: 'Coding Style',
                artifactSlug: 'coding-style',
                artifactId: 'artifact-1',
                artifactVersion: 1,
                spaceId: 'space-1',
              },
            ],
            delete: [],
          },
          skillFolders: [],
          resolvedAgents: ['claude', 'cursor', 'packmind'],
        });

        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
          agents: [],
        });
      });

      it('uses resolvedAgents when command.agents is empty', () => {
        expect(mockLockFileRepository.write).toHaveBeenCalledWith(
          '/test',
          expect.objectContaining({
            agents: ['claude', 'cursor', 'packmind'],
          }),
        );
      });
    });

    describe('when skill files have isSkillDefinition flag', () => {
      beforeEach(async () => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.claude/skills/my-skill/SKILL.md',
                content: '# My Skill',
                artifactType: 'skill',
                artifactName: 'My Skill',
                artifactSlug: 'my-skill',
                artifactId: 'artifact-1',
                artifactVersion: 1,
                spaceId: 'space-1',
              },
              {
                path: '.claude/skills/my-skill/LICENSE.txt',
                content: 'MIT',
                artifactType: 'skill',
                artifactName: 'My Skill',
                artifactSlug: 'my-skill',
                artifactId: 'artifact-1',
                artifactVersion: 1,
                spaceId: 'space-1',
                skillFileId: 'file-123',
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });

        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
          agents: ['claude'],
        });
      });

      it('marks SKILL.md as isSkillDefinition and not additional files', () => {
        expect(mockLockFileRepository.write).toHaveBeenCalledWith(
          '/test',
          expect.objectContaining({
            artifacts: {
              'my-skill': expect.objectContaining({
                files: [
                  {
                    path: '.claude/skills/my-skill/SKILL.md',
                    agent: 'claude',
                    isSkillDefinition: true,
                  },
                  {
                    path: '.claude/skills/my-skill/LICENSE.txt',
                    agent: 'claude',
                  },
                ],
              }),
            },
          }),
        );
      });
    });

    describe('when pull response includes targetId', () => {
      beforeEach(async () => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.packmind/standards/coding-style.md',
                content: '# Coding Style',
                artifactType: 'standard',
                artifactName: 'Coding Style',
                artifactSlug: 'coding-style',
                artifactId: 'artifact-1',
                artifactVersion: 1,
                spaceId: 'space-1',
              },
            ],
            delete: [],
          },
          skillFolders: [],
          targetId: 'target-abc',
        });

        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
          agents: ['packmind'],
        });
      });

      it('includes targetId in the lock file', () => {
        expect(mockLockFileRepository.write).toHaveBeenCalledWith(
          '/test',
          expect.objectContaining({
            targetId: 'target-abc',
          }),
        );
      });
    });

    describe('when pull response omits targetId', () => {
      beforeEach(async () => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.packmind/standards/coding-style.md',
                content: '# Coding Style',
                artifactType: 'standard',
                artifactName: 'Coding Style',
                artifactSlug: 'coding-style',
                artifactId: 'artifact-1',
                artifactVersion: 1,
                spaceId: 'space-1',
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });

        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

        await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
          agents: ['packmind'],
        });
      });

      it('does not include targetId in the lock file', () => {
        const writtenLockFile = mockLockFileRepository.write.mock.calls[0][1];

        expect(writtenLockFile).not.toHaveProperty('targetId');
      });
    });

    describe('when lock file write fails', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.packmind/standards/coding-style.md',
                content: '# Coding Style',
                artifactType: 'standard',
                artifactName: 'Coding Style',
                artifactSlug: 'coding-style',
                artifactId: 'artifact-1',
                artifactVersion: 1,
                spaceId: 'space-1',
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });

        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

        mockLockFileRepository.write.mockRejectedValue(
          new Error('Permission denied'),
        );

        result = await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
          agents: ['packmind'],
        });
      });

      it('pushes error to result errors', () => {
        expect(result.errors).toContainEqual(
          'Failed to write lock file: Permission denied',
        );
      });

      it('still returns successful install result', () => {
        expect(result.filesCreated).toBe(1);
      });
    });

    describe('when install fails', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        mockGateway.deployment.pull.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.packmind/standards/coding-style.md',
                content: '# Coding Style',
                artifactType: 'standard',
                artifactName: 'Coding Style',
                artifactSlug: 'coding-style',
                artifactId: 'artifact-1',
                artifactVersion: 1,
                spaceId: 'space-1',
              },
            ],
            delete: [],
          },
          skillFolders: [],
        });

        // Make deleteSkillFolders throw to simulate install failure
        jest
          .spyOn(useCase as never, 'deleteSkillFolders' as never)
          .mockRejectedValue(new Error('Critical failure'));

        result = await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
          agents: ['packmind'],
        });
      });

      it('does not write lock file', () => {
        expect(mockLockFileRepository.write).not.toHaveBeenCalled();
      });

      it('reports the install failure error', () => {
        expect(result.errors).toContainEqual(
          'Failed to install packages: Critical failure',
        );
      });
    });
  });
});
