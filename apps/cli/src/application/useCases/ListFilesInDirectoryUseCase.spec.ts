import { ListFilesInDirectoryUseCase } from './ListFilesInDirectoryUseCase';
import { ListFiles } from '../services/ListFiles';

describe('ListFilesInDirectoryUseCase', () => {
  let useCase: ListFilesInDirectoryUseCase;
  let mockListFiles: jest.Mocked<Pick<ListFiles, 'listFilesInDirectory'>>;

  beforeEach(() => {
    mockListFiles = {
      listFilesInDirectory: jest.fn(),
    };

    useCase = new ListFilesInDirectoryUseCase(
      mockListFiles as unknown as ListFiles,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to ListFiles service with correct parameters', async () => {
    const mockResult = [
      { path: '/path/to/file.ts', content: 'content1' },
      { path: '/path/to/file.js', content: 'content2' },
    ];
    mockListFiles.listFilesInDirectory.mockResolvedValue(mockResult);

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
    expect(result).toBe(mockResult);
  });

  it('uses empty array as default for excludes parameter', async () => {
    const mockResult = [{ path: '/path/to/file.ts', content: 'content' }];
    mockListFiles.listFilesInDirectory.mockResolvedValue(mockResult);

    const result = await useCase.execute({
      path: '/test/path',
      extensions: ['.ts'],
    });

    expect(mockListFiles.listFilesInDirectory).toHaveBeenCalledWith(
      '/test/path',
      ['.ts'],
      [],
    );
    expect(result).toBe(mockResult);
  });

  it('returns result from ListFiles service', async () => {
    const mockResult = [
      { path: '/file1.ts', content: 'typescript content' },
      { path: '/file2.js', content: 'javascript content' },
      { path: '/nested/file3.ts', content: 'nested content' },
    ];
    mockListFiles.listFilesInDirectory.mockResolvedValue(mockResult);

    const result = await useCase.execute({
      path: '/project',
      extensions: ['ts', 'js'],
      excludes: ['dist', 'node_modules'],
    });

    expect(result).toEqual(mockResult);
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
