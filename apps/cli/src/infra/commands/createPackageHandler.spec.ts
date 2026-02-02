import { createPackageHandler } from './createPackageHandler';
import { ICreatePackageUseCase } from '../../domain/useCases/ICreatePackageUseCase';

describe('createPackageHandler', () => {
  let mockUseCase: jest.Mocked<ICreatePackageUseCase>;

  beforeEach(() => {
    mockUseCase = {
      execute: jest.fn(),
    };
  });

  describe('when creating a package with name only', () => {
    let result: Awaited<ReturnType<typeof createPackageHandler>>;

    beforeEach(async () => {
      mockUseCase.execute.mockResolvedValue({
        packageId: 'pkg-123',
        name: 'FrontEnd',
        slug: 'frontend',
      });

      result = await createPackageHandler('FrontEnd', undefined, mockUseCase);
    });

    it('returns success', () => {
      expect(result.success).toBe(true);
    });

    it('returns the slug', () => {
      expect(result.slug).toBe('frontend');
    });

    it('returns the packageName', () => {
      expect(result.packageName).toBe('FrontEnd');
    });

    it('calls use case with correct command', () => {
      expect(mockUseCase.execute).toHaveBeenCalledWith({
        name: 'FrontEnd',
        description: undefined,
      });
    });
  });

  describe('when creating a package with name and description', () => {
    let result: Awaited<ReturnType<typeof createPackageHandler>>;

    beforeEach(async () => {
      mockUseCase.execute.mockResolvedValue({
        packageId: 'pkg-456',
        name: 'BackEnd',
        slug: 'backend',
      });

      result = await createPackageHandler(
        'BackEnd',
        'Backend standards',
        mockUseCase,
      );
    });

    it('returns success', () => {
      expect(result.success).toBe(true);
    });

    it('passes description to use case', () => {
      expect(mockUseCase.execute).toHaveBeenCalledWith({
        name: 'BackEnd',
        description: 'Backend standards',
      });
    });
  });

  describe('when use case throws an error', () => {
    let result: Awaited<ReturnType<typeof createPackageHandler>>;

    beforeEach(async () => {
      mockUseCase.execute.mockRejectedValue(new Error('Network error'));

      result = await createPackageHandler('FrontEnd', undefined, mockUseCase);
    });

    it('returns failure', () => {
      expect(result.success).toBe(false);
    });

    it('returns the error message', () => {
      expect(result.error).toBe('Network error');
    });
  });

  describe('when name is empty', () => {
    let result: Awaited<ReturnType<typeof createPackageHandler>>;

    beforeEach(async () => {
      result = await createPackageHandler('', undefined, mockUseCase);
    });

    it('returns failure', () => {
      expect(result.success).toBe(false);
    });

    it('returns validation error message', () => {
      expect(result.error).toBe('Package name is required');
    });

    it('does not call use case', () => {
      expect(mockUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('when name is whitespace only', () => {
    let result: Awaited<ReturnType<typeof createPackageHandler>>;

    beforeEach(async () => {
      result = await createPackageHandler('   ', undefined, mockUseCase);
    });

    it('returns failure', () => {
      expect(result.success).toBe(false);
    });

    it('returns validation error message', () => {
      expect(result.error).toBe('Package name is required');
    });

    it('does not call use case', () => {
      expect(mockUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
