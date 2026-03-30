import {
  CheckCliVersionUseCase,
  ICheckCliVersionDependencies,
} from './CheckCliVersionUseCase';

describe('CheckCliVersionUseCase', () => {
  let mockFetchLatestVersion: jest.MockedFunction<
    ICheckCliVersionDependencies['fetchLatestVersion']
  >;
  let mockFetchFn: jest.MockedFunction<typeof fetch>;
  let useCase: CheckCliVersionUseCase;

  function createUseCase(
    overrides?: Partial<ICheckCliVersionDependencies>,
  ): CheckCliVersionUseCase {
    return new CheckCliVersionUseCase({
      fetchLatestVersion: mockFetchLatestVersion,
      fetchFn: mockFetchFn,
      timeoutMs: 1000,
      ...overrides,
    });
  }

  beforeEach(() => {
    mockFetchLatestVersion = jest.fn();
    mockFetchFn = jest.fn();
    useCase = createUseCase();
  });

  describe('when latest version is newer', () => {
    beforeEach(() => {
      mockFetchLatestVersion.mockResolvedValue('1.2.0');
    });

    it('returns updateAvailable as true with correct versions', async () => {
      const result = await useCase.execute({ currentVersion: '1.0.0' });

      expect(result).toEqual({
        currentVersion: '1.0.0',
        latestVersion: '1.2.0',
        updateAvailable: true,
      });
    });
  });

  describe('when current version matches latest', () => {
    beforeEach(() => {
      mockFetchLatestVersion.mockResolvedValue('1.0.0');
    });

    it('returns updateAvailable as false', async () => {
      const result = await useCase.execute({ currentVersion: '1.0.0' });

      expect(result).toEqual({
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        updateAvailable: false,
      });
    });
  });

  describe('when current version is newer', () => {
    beforeEach(() => {
      mockFetchLatestVersion.mockResolvedValue('1.0.0');
    });

    it('returns updateAvailable as false', async () => {
      const result = await useCase.execute({ currentVersion: '2.0.0' });

      expect(result).toEqual({
        currentVersion: '2.0.0',
        latestVersion: '1.0.0',
        updateAvailable: false,
      });
    });
  });

  describe('when fetch fails', () => {
    beforeEach(() => {
      mockFetchLatestVersion.mockRejectedValue(new Error('Network error'));
    });

    it('returns null', async () => {
      const result = await useCase.execute({ currentVersion: '1.0.0' });

      expect(result).toBeNull();
    });
  });

  describe('when fetch times out', () => {
    beforeEach(() => {
      mockFetchLatestVersion.mockImplementation(
        () =>
          new Promise<string>(() => {
            // intentionally never resolves to simulate timeout
          }),
      );
      useCase = createUseCase({ timeoutMs: 50 });
    });

    it('returns null', async () => {
      const result = await useCase.execute({ currentVersion: '1.0.0' });

      expect(result).toBeNull();
    });
  });

  it('passes fetchFn to fetchLatestVersion', async () => {
    mockFetchLatestVersion.mockResolvedValue('1.0.0');

    await useCase.execute({ currentVersion: '1.0.0' });

    expect(mockFetchLatestVersion).toHaveBeenCalledWith(mockFetchFn);
  });
});
