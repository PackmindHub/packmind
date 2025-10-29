import { ListFilesInDirectoryUseCase } from './ListFilesInDirectoryUseCase';
import { ListFiles } from '../services/ListFiles';

describe('ListFilesInDirectoryUseCase', () => {
  let useCase: ListFilesInDirectoryUseCase;
  let mockListFiles: jest.Mocked<
    Pick<ListFiles, 'listFilesInDirectory' | 'readFileContent'>
  >;

  beforeEach(() => {
    mockListFiles = {
      listFilesInDirectory: jest.fn(),
      readFileContent: jest.fn(),
    };

    useCase = new ListFilesInDirectoryUseCase(
      mockListFiles as unknown as ListFiles,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to ListFiles service with correct parameters', async () => {
    const mockFiles = [
      { path: '/path/to/file.ts' },
      { path: '/path/to/file.js' },
    ];
    mockListFiles.listFilesInDirectory.mockResolvedValue(mockFiles);
    mockListFiles.readFileContent.mockImplementation(async (filePath) => {
      if (filePath === '/path/to/file.ts') return 'content1';
      if (filePath === '/path/to/file.js') return 'content2';
      return '';
    });

    const result = await useCase.execute({
      path: '/test/path',
      extensions: ['.ts', '.js'],
      excludes: ['node_modules'],
    });

    expect(mockListFiles.listFilesInDirectory).toHaveBeenCalledWith(
      '/test/path',
      ['.ts', '.js'],
      ['node_modules'],
    );
    expect(result).toEqual([
      { path: '/path/to/file.ts', content: 'content1' },
      { path: '/path/to/file.js', content: 'content2' },
    ]);
  });

  it('uses empty array as default for excludes parameter', async () => {
    const mockFiles = [{ path: '/path/to/file.ts' }];
    mockListFiles.listFilesInDirectory.mockResolvedValue(mockFiles);
    mockListFiles.readFileContent.mockResolvedValue('content');

    const result = await useCase.execute({
      path: '/test/path',
      extensions: ['.ts'],
    });

    expect(mockListFiles.listFilesInDirectory).toHaveBeenCalledWith(
      '/test/path',
      ['.ts'],
      [],
    );
    expect(result).toEqual([{ path: '/path/to/file.ts', content: 'content' }]);
  });

  it('returns result from ListFiles service', async () => {
    const mockFiles = [
      { path: '/file1.ts' },
      { path: '/file2.js' },
      { path: '/nested/file3.ts' },
    ];
    mockListFiles.listFilesInDirectory.mockResolvedValue(mockFiles);
    mockListFiles.readFileContent.mockImplementation(async (filePath) => {
      if (filePath === '/file1.ts') return 'typescript content';
      if (filePath === '/file2.js') return 'javascript content';
      if (filePath === '/nested/file3.ts') return 'nested content';
      return '';
    });

    const result = await useCase.execute({
      path: '/project',
      extensions: ['ts', 'js'],
      excludes: ['dist', 'node_modules'],
    });

    expect(result).toEqual([
      { path: '/file1.ts', content: 'typescript content' },
      { path: '/file2.js', content: 'javascript content' },
      { path: '/nested/file3.ts', content: 'nested content' },
    ]);
  });

  it('propagates errors from ListFiles service', async () => {
    const error = new Error('File system error');
    mockListFiles.listFilesInDirectory.mockRejectedValue(error);

    await expect(
      useCase.execute({
        path: '/invalid/path',
        extensions: ['.ts'],
      }),
    ).rejects.toThrow('File system error');
  });
});
