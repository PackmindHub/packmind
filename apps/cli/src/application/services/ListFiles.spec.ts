import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ListFiles } from './ListFiles';

describe('ListFiles', () => {
  let tempDir: string;
  let listFiles: ListFiles;

  beforeEach(async () => {
    listFiles = new ListFiles();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('finds files with specified extensions recursively', async () => {
    await fs.mkdir(path.join(tempDir, 'subdir'));
    await fs.writeFile(path.join(tempDir, 'file1.ts'), 'content1');
    await fs.writeFile(path.join(tempDir, 'file2.js'), 'content2');
    await fs.writeFile(path.join(tempDir, 'file3.txt'), 'content3');
    await fs.writeFile(path.join(tempDir, 'subdir', 'file4.ts'), 'content4');
    await fs.writeFile(path.join(tempDir, 'subdir', 'file5.md'), 'content5');

    const result = await listFiles.listFilesInDirectory(tempDir, [
      '.ts',
      '.js',
    ]);

    expect(result).toHaveLength(3);
    expect(result).toContainEqual({
      path: path.join(tempDir, 'file1.ts'),
    });
    expect(result).toContainEqual({
      path: path.join(tempDir, 'file2.js'),
    });
    expect(result).toContainEqual({
      path: path.join(tempDir, 'subdir', 'file4.ts'),
    });
  });

  it('returns all files no extensions are provided', async () => {
    await fs.mkdir(path.join(tempDir, 'subdir'));
    await fs.writeFile(path.join(tempDir, 'file1.ts'), 'content1');
    await fs.writeFile(path.join(tempDir, 'file2.js'), 'content2');
    await fs.writeFile(path.join(tempDir, 'subdir', 'file3.json'), 'content3');

    const result = await listFiles.listFilesInDirectory(tempDir, []);

    expect(result).toHaveLength(3);
    expect(result).toEqual(
      expect.arrayContaining([
        {
          path: path.join(tempDir, 'file1.ts'),
        },
        {
          path: path.join(tempDir, 'file2.js'),
        },
        {
          path: path.join(tempDir, 'subdir', 'file3.json'),
        },
      ]),
    );
  });

  it('handles extensions with or without dots', async () => {
    await fs.writeFile(path.join(tempDir, 'file.ts'), 'typescript file');
    await fs.writeFile(path.join(tempDir, 'file.js'), 'javascript file');

    const result = await listFiles.listFilesInDirectory(tempDir, ['ts', 'js']);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      path: path.join(tempDir, 'file.ts'),
    });
    expect(result).toContainEqual({
      path: path.join(tempDir, 'file.js'),
    });
  });

  describe('when no files match', () => {
    it('returns empty array ', async () => {
      await fs.writeFile(path.join(tempDir, 'file.txt'), 'text file');

      const result = await listFiles.listFilesInDirectory(tempDir, [
        '.ts',
        '.js',
      ]);

      expect(result).toHaveLength(0);
    });
  });

  it('handles empty directories', async () => {
    const result = await listFiles.listFilesInDirectory(tempDir, ['.ts']);

    expect(result).toHaveLength(0);
  });

  it('handles deeply nested directories', async () => {
    const deepPath = path.join(tempDir, 'a', 'b', 'c');
    await fs.mkdir(deepPath, { recursive: true });
    await fs.writeFile(path.join(deepPath, 'deep.ts'), 'deep content');

    const result = await listFiles.listFilesInDirectory(tempDir, ['.ts']);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      path: path.join(deepPath, 'deep.ts'),
    });
  });

  it('excludes files in simple directory patterns', async () => {
    await fs.mkdir(path.join(tempDir, 'node_modules'));
    await fs.mkdir(path.join(tempDir, 'dist'));
    await fs.mkdir(path.join(tempDir, 'src'));

    await fs.writeFile(path.join(tempDir, 'file.ts'), 'main file');
    await fs.writeFile(
      path.join(tempDir, 'node_modules', 'lib.ts'),
      'node_modules file',
    );
    await fs.writeFile(path.join(tempDir, 'dist', 'build.ts'), 'dist file');
    await fs.writeFile(path.join(tempDir, 'src', 'source.ts'), 'src file');

    const result = await listFiles.listFilesInDirectory(
      tempDir,
      ['.ts'],
      ['node_modules', 'dist'],
    );

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      path: path.join(tempDir, 'file.ts'),
    });
    expect(result).toContainEqual({
      path: path.join(tempDir, 'src', 'source.ts'),
    });
  });

  it('excludes files matching glob patterns', async () => {
    await fs.mkdir(path.join(tempDir, 'packages', 'pkg1', 'infra'), {
      recursive: true,
    });
    await fs.mkdir(path.join(tempDir, 'packages', 'pkg2', 'infra'), {
      recursive: true,
    });
    await fs.mkdir(path.join(tempDir, 'packages', 'pkg1', 'src'), {
      recursive: true,
    });

    await fs.writeFile(path.join(tempDir, 'main.ts'), 'main file');
    await fs.writeFile(
      path.join(tempDir, 'packages', 'pkg1', 'infra', 'repo.ts'),
      'infra file 1',
    );
    await fs.writeFile(
      path.join(tempDir, 'packages', 'pkg2', 'infra', 'repo.ts'),
      'infra file 2',
    );
    await fs.writeFile(
      path.join(tempDir, 'packages', 'pkg1', 'src', 'logic.ts'),
      'src file',
    );

    const result = await listFiles.listFilesInDirectory(
      tempDir,
      ['.ts'],
      ['packages/**/infra'],
    );

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      path: path.join(tempDir, 'main.ts'),
    });
    expect(result).toContainEqual({
      path: path.join(tempDir, 'packages', 'pkg1', 'src', 'logic.ts'),
    });
  });

  it('handles multiple exclude patterns', async () => {
    await fs.mkdir(path.join(tempDir, 'node_modules', 'lib'), {
      recursive: true,
    });
    await fs.mkdir(path.join(tempDir, 'dist'));
    await fs.mkdir(path.join(tempDir, 'packages', 'pkg1', 'infra'), {
      recursive: true,
    });
    await fs.mkdir(path.join(tempDir, 'src'));

    await fs.writeFile(path.join(tempDir, 'main.ts'), 'main file');
    await fs.writeFile(
      path.join(tempDir, 'node_modules', 'lib', 'dep.ts'),
      'dependency',
    );
    await fs.writeFile(path.join(tempDir, 'dist', 'build.ts'), 'build file');
    await fs.writeFile(
      path.join(tempDir, 'packages', 'pkg1', 'infra', 'repo.ts'),
      'infra file',
    );
    await fs.writeFile(path.join(tempDir, 'src', 'code.ts'), 'source code');

    const result = await listFiles.listFilesInDirectory(
      tempDir,
      ['.ts'],
      ['node_modules', 'dist', 'packages/**/infra'],
    );

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      path: path.join(tempDir, 'main.ts'),
    });
    expect(result).toContainEqual({
      path: path.join(tempDir, 'src', 'code.ts'),
    });
  });

  it('works without exclude patterns', async () => {
    await fs.writeFile(path.join(tempDir, 'file.ts'), 'content');

    const result = await listFiles.listFilesInDirectory(tempDir, ['.ts'], []);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      path: path.join(tempDir, 'file.ts'),
    });
  });

  describe('skipHidden parameter', () => {
    describe('when skipHidden is true (default)', () => {
      it('returns only visible files', async () => {
        await fs.writeFile(path.join(tempDir, 'visible.ts'), 'visible');
        await fs.writeFile(path.join(tempDir, '.hidden.ts'), 'hidden');

        const result = await listFiles.listFilesInDirectory(tempDir, ['.ts']);

        expect(result).toEqual([
          {
            path: path.join(tempDir, 'visible.ts'),
          },
        ]);
      });

      it('excludes files in hidden directories', async () => {
        await fs.mkdir(path.join(tempDir, '.hidden'));
        await fs.mkdir(path.join(tempDir, 'visible'));
        await fs.writeFile(
          path.join(tempDir, '.hidden', 'file.ts'),
          'hidden dir file',
        );
        await fs.writeFile(
          path.join(tempDir, 'visible', 'file.ts'),
          'visible dir file',
        );

        const result = await listFiles.listFilesInDirectory(tempDir, ['.ts']);

        expect(result).toEqual([
          {
            path: path.join(tempDir, 'visible', 'file.ts'),
          },
        ]);
      });

      it('excludes files in deeply nested hidden directories', async () => {
        await fs.mkdir(path.join(tempDir, 'visible', '.git', 'objects'), {
          recursive: true,
        });
        await fs.mkdir(path.join(tempDir, 'visible', 'src'), {
          recursive: true,
        });
        await fs.writeFile(
          path.join(tempDir, 'visible', '.git', 'objects', 'file.ts'),
          'git file',
        );
        await fs.writeFile(
          path.join(tempDir, 'visible', 'src', 'code.ts'),
          'source code',
        );

        const result = await listFiles.listFilesInDirectory(tempDir, ['.ts']);

        expect(result).toEqual([
          {
            path: path.join(tempDir, 'visible', 'src', 'code.ts'),
          },
        ]);
      });
    });

    describe('when skipHidden is false', () => {
      it('returns both visible and hidden files', async () => {
        await fs.writeFile(path.join(tempDir, 'visible.ts'), 'visible');
        await fs.writeFile(path.join(tempDir, '.hidden.ts'), 'hidden');

        const result = await listFiles.listFilesInDirectory(
          tempDir,
          ['.ts'],
          [],
          false,
        );

        expect(result).toEqual(
          expect.arrayContaining([
            {
              path: path.join(tempDir, 'visible.ts'),
            },
            {
              path: path.join(tempDir, '.hidden.ts'),
            },
          ]),
        );
      });

      it('traverses hidden directories', async () => {
        await fs.mkdir(path.join(tempDir, '.hidden'));
        await fs.mkdir(path.join(tempDir, 'visible'));
        await fs.writeFile(
          path.join(tempDir, '.hidden', 'file.ts'),
          'hidden dir file',
        );
        await fs.writeFile(
          path.join(tempDir, 'visible', 'file.ts'),
          'visible dir file',
        );

        const result = await listFiles.listFilesInDirectory(
          tempDir,
          ['.ts'],
          [],
          false,
        );

        expect(result).toEqual(
          expect.arrayContaining([
            {
              path: path.join(tempDir, '.hidden', 'file.ts'),
            },
            {
              path: path.join(tempDir, 'visible', 'file.ts'),
            },
          ]),
        );
      });
    });
  });

  describe('readFileContent', () => {
    it('reads and returns file content', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'file content');

      const content = await listFiles.readFileContent(filePath);

      expect(content).toBe('file content');
    });

    it('throws error for non-existent file', async () => {
      const filePath = path.join(tempDir, 'non-existent.txt');

      await expect(listFiles.readFileContent(filePath)).rejects.toThrow();
    });

    it('handles file with special characters', async () => {
      const filePath = path.join(tempDir, 'special.txt');
      const specialContent = 'Special chars: éàü\n\t"quotes"';
      await fs.writeFile(filePath, specialContent, 'utf-8');

      const content = await listFiles.readFileContent(filePath);

      expect(content).toBe(specialContent);
    });
  });
});
