import { addToPackageHandler } from './addToPackageHandler';
import { IAddToPackageUseCase } from '../../domain/useCases/IAddToPackageUseCase';

describe('addToPackageHandler', () => {
  let mockUseCase: jest.Mocked<IAddToPackageUseCase>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() } as jest.Mocked<IAddToPackageUseCase>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when adding standards successfully', () => {
    let result: Awaited<ReturnType<typeof addToPackageHandler>>;

    beforeEach(async () => {
      mockUseCase.execute.mockResolvedValue({
        added: ['std-1', 'std-2'],
        skipped: [],
      });

      result = await addToPackageHandler(
        'my-package',
        'standard',
        ['std-1', 'std-2'],
        mockUseCase,
      );
    });

    it('returns success true', () => {
      expect(result.success).toBe(true);
    });

    it('returns added items', () => {
      expect(result.added).toEqual(['std-1', 'std-2']);
    });
  });

  describe('when some items are skipped', () => {
    let result: Awaited<ReturnType<typeof addToPackageHandler>>;

    beforeEach(async () => {
      mockUseCase.execute.mockResolvedValue({
        added: ['std-1'],
        skipped: ['std-2'],
      });

      result = await addToPackageHandler(
        'my-package',
        'standard',
        ['std-1', 'std-2'],
        mockUseCase,
      );
    });

    it('returns success true', () => {
      expect(result.success).toBe(true);
    });

    it('returns skipped items', () => {
      expect(result.skipped).toEqual(['std-2']);
    });
  });

  describe('when no items provided', () => {
    let result: Awaited<ReturnType<typeof addToPackageHandler>>;

    beforeEach(async () => {
      result = await addToPackageHandler(
        'my-package',
        'standard',
        [],
        mockUseCase,
      );
    });

    it('returns success false', () => {
      expect(result.success).toBe(false);
    });

    it('returns error message', () => {
      expect(result.error).toBe('No items provided to add');
    });
  });

  describe('when use case throws error', () => {
    let result: Awaited<ReturnType<typeof addToPackageHandler>>;

    beforeEach(async () => {
      mockUseCase.execute.mockRejectedValue(new Error('Item not found'));

      result = await addToPackageHandler(
        'my-package',
        'standard',
        ['std-1'],
        mockUseCase,
      );
    });

    it('returns success false', () => {
      expect(result.success).toBe(false);
    });

    it('returns error message', () => {
      expect(result.error).toBe('Item not found');
    });
  });
});
