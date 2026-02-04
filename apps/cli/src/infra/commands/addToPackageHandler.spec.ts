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
    it('returns success with added items', async () => {
      mockUseCase.execute.mockResolvedValue({
        added: ['std-1', 'std-2'],
        skipped: [],
      });

      const result = await addToPackageHandler(
        'my-package',
        'standard',
        ['std-1', 'std-2'],
        mockUseCase,
      );

      expect(result.success).toBe(true);
      expect(result.added).toEqual(['std-1', 'std-2']);
    });
  });

  describe('when some items are skipped', () => {
    it('returns success with skipped items', async () => {
      mockUseCase.execute.mockResolvedValue({
        added: ['std-1'],
        skipped: ['std-2'],
      });

      const result = await addToPackageHandler(
        'my-package',
        'standard',
        ['std-1', 'std-2'],
        mockUseCase,
      );

      expect(result.success).toBe(true);
      expect(result.skipped).toEqual(['std-2']);
    });
  });

  describe('when no items provided', () => {
    it('returns error', async () => {
      const result = await addToPackageHandler(
        'my-package',
        'standard',
        [],
        mockUseCase,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('No items provided to add');
    });
  });

  describe('when use case throws error', () => {
    it('returns error with message', async () => {
      mockUseCase.execute.mockRejectedValue(new Error('Item not found'));

      const result = await addToPackageHandler(
        'my-package',
        'standard',
        ['std-1'],
        mockUseCase,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Item not found');
    });
  });
});
