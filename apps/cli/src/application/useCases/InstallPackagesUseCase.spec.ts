import * as fs from 'fs/promises';

import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { InstallPackagesUseCase } from './InstallPackagesUseCase';

jest.mock('fs/promises');

describe('InstallPackagesUseCase', () => {
  let useCase: InstallPackagesUseCase;
  let mockGateway: jest.Mocked<IPackmindGateway>;

  beforeEach(() => {
    mockGateway = {
      listPackages: jest.fn(),
      getPullData: jest.fn(),
      listExecutionPrograms: jest.fn(),
      getDraftDetectionProgramsForRule: jest.fn(),
      getActiveDetectionProgramsForRule: jest.fn(),
      getPackageSummary: jest.fn(),
    };

    // Setup fs mocks using jest.Mock casting
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.appendFile as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockResolvedValue('');
    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);
    (fs.stat as jest.Mock).mockResolvedValue(null);
    (fs.rm as jest.Mock).mockResolvedValue(undefined);

    useCase = new InstallPackagesUseCase(mockGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when file does not exist', () => {
    it('creates new file with content', async () => {
      mockGateway.getPullData.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: 'CLAUDE.md',
              content: '# New content',
            },
          ],
          delete: [],
        },
      });

      // File does not exist
      (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/CLAUDE.md',
        '# New content',
        'utf-8',
      );
      expect(result.filesCreated).toBe(1);
      expect(result.filesUpdated).toBe(0);
    });
  });

  describe('when file exists without comment markers', () => {
    it('replaces entire file content', async () => {
      const newContent = '# Completely new content\n\nThis is new.';

      mockGateway.getPullData.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: 'CLAUDE.md',
              content: newContent,
            },
          ],
          delete: [],
        },
      });

      // File exists
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      // Existing file content without comment markers
      const existingContent = '# Old content\n\nThis is old content.';
      (fs.readFile as jest.Mock).mockResolvedValue(existingContent);

      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/CLAUDE.md',
        newContent,
        'utf-8',
      );
      expect(result.filesUpdated).toBe(1);
      expect(result.filesCreated).toBe(0);
    });
  });

  describe('when file exists with matching comment markers', () => {
    it('replaces only the marked section', async () => {
      const newSectionContent = '## New Recipe\n- Step 1\n- Step 2';
      const contentWithMarkers = `<!-- start: Packmind recipes -->\n${newSectionContent}\n<!-- end: Packmind recipes -->`;

      mockGateway.getPullData.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: 'CLAUDE.md',
              content: contentWithMarkers,
            },
          ],
          delete: [],
        },
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

      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      const expectedContent = `# Project Documentation

Some introduction text.

<!-- start: Packmind recipes -->
${newSectionContent}
<!-- end: Packmind recipes -->

Some footer text.`;

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/CLAUDE.md',
        expectedContent,
        'utf-8',
      );
      expect(result.filesUpdated).toBe(1);
      expect(result.filesCreated).toBe(0);
    });

    it('handles multiple sections with different markers', async () => {
      const newStandardsContent = '- Standard A\n- Standard B';
      const contentWithMarkers = `<!-- start: Packmind standards -->\n${newStandardsContent}\n<!-- end: Packmind standards -->`;

      mockGateway.getPullData.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: 'CLAUDE.md',
              content: contentWithMarkers,
            },
          ],
          delete: [],
        },
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

      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      const expectedContent = `# Documentation

<!-- start: Packmind recipes -->
## Recipe content
<!-- end: Packmind recipes -->

<!-- start: Packmind standards -->
${newStandardsContent}
<!-- end: Packmind standards -->

Footer text.`;

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/CLAUDE.md',
        expectedContent,
        'utf-8',
      );
      expect(result.filesUpdated).toBe(1);
    });
  });

  describe('when file exists but section does not exist yet', () => {
    it('appends new section to existing file', async () => {
      const newSectionContent = '## New Recipe\n- Step 1';
      const contentWithMarkers = `<!-- start: Packmind recipes -->\n${newSectionContent}\n<!-- end: Packmind recipes -->`;

      mockGateway.getPullData.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: 'CLAUDE.md',
              content: contentWithMarkers,
            },
          ],
          delete: [],
        },
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

      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      const expectedContent = `# Project Documentation

Some existing content here.

<!-- start: Packmind standards -->
- Standard content
<!-- end: Packmind standards -->
<!-- start: Packmind recipes -->
${newSectionContent}
<!-- end: Packmind recipes -->`;

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/CLAUDE.md',
        expectedContent,
        'utf-8',
      );
      expect(result.filesUpdated).toBe(1);
    });
  });

  describe('when processing delete operations', () => {
    it('deletes existing file', async () => {
      mockGateway.getPullData.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [],
          delete: [
            {
              path: 'old-file.md',
            },
          ],
        },
      });

      // File exists and is a file
      (fs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
      });

      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(fs.unlink).toHaveBeenCalledWith('/test/old-file.md');
      expect(result.filesDeleted).toBe(1);
    });

    it('deletes existing directory recursively', async () => {
      mockGateway.getPullData.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [],
          delete: [
            {
              path: '.packmind',
            },
          ],
        },
      });

      // Path exists and is a directory
      (fs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => true,
        isFile: () => false,
      });

      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(fs.rm).toHaveBeenCalledWith('/test/.packmind', {
        recursive: true,
        force: true,
      });
      expect(fs.unlink).not.toHaveBeenCalled();
      expect(result.filesDeleted).toBe(1);
    });

    describe('when file to delete does not exist', () => {
      beforeEach(() => {
        mockGateway.getPullData.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [],
            delete: [
              {
                path: 'non-existent.md',
              },
            ],
          },
        });

        // stat returns null when file does not exist (caught error)
        (fs.stat as jest.Mock).mockResolvedValue(null);
      });

      it('does not throw error', async () => {
        const result = await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(fs.unlink).not.toHaveBeenCalled();
        expect(fs.rm).not.toHaveBeenCalled();
        expect(result.filesDeleted).toBe(0);
        expect(result.errors).toEqual([]);
      });
    });
  });

  describe('error handling', () => {
    describe('when file operation fails', () => {
      beforeEach(() => {
        mockGateway.getPullData.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: 'CLAUDE.md',
                content: 'content',
              },
            ],
            delete: [],
          },
        });

        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));
        (fs.writeFile as jest.Mock).mockRejectedValue(
          new Error('Permission denied'),
        );
      });

      it('captures errors', async () => {
        const result = await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Failed to create/update CLAUDE.md');
        expect(result.errors[0]).toContain('Permission denied');
      });
    });
  });

  describe('when file content has not changed', () => {
    describe('with full content replacement', () => {
      const content = '# Unchanged content\n\nThis is the same.';

      beforeEach(() => {
        mockGateway.getPullData.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: 'CLAUDE.md',
                content,
              },
            ],
            delete: [],
          },
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
        mockGateway.getPullData.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: 'CLAUDE.md',
                content: newContentWithMarkers,
              },
            ],
            delete: [],
          },
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
        mockGateway.getPullData.mockResolvedValue({
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
        mockGateway.getPullData.mockResolvedValue({
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
        mockGateway.getPullData.mockResolvedValue({
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
        mockGateway.getPullData.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: 'README.md',
                content: textContent,
              },
            ],
            delete: [],
          },
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
      it('deletes file', async () => {
        mockGateway.getPullData.mockResolvedValue({
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
        });

        // File exists
        (fs.access as jest.Mock).mockResolvedValue(undefined);

        // Existing file has only the packmind section (no user content)
        const existingContent = `<!-- start: packmind-section -->
Old packmind content
<!-- end: packmind-section -->`;
        (fs.readFile as jest.Mock).mockResolvedValue(existingContent);

        const result = await useCase.execute({
          packagesSlugs: ['test-package'],
          baseDirectory: '/test',
        });

        expect(fs.unlink).toHaveBeenCalledWith(
          '/test/.cursor/rules/config.mdc',
        );
        expect(fs.writeFile).not.toHaveBeenCalled();
        expect(result.filesDeleted).toBe(1);
        expect(result.filesUpdated).toBe(0);
      });
    });

    it('preserves file with user content after section merge', async () => {
      mockGateway.getPullData.mockResolvedValue({
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

      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(fs.unlink).not.toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
      expect(result.filesUpdated).toBe(1);
      expect(result.filesDeleted).toBe(0);
    });
  });
});
