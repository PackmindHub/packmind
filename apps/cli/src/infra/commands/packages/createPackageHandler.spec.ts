import { createPackageHandler } from './createPackageHandler';
import { ICreatePackageUseCase } from '../../../domain/useCases/ICreatePackageUseCase';

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
        spaceSlug: 'global',
      });

      result = await createPackageHandler('FrontEnd', undefined, mockUseCase);
    });

    it('returns success', () => {
      expect(result.success).toBe(true);
    });

    it('returns the slug with space prefix', () => {
      expect(result.slug).toBe('@global/frontend');
    });

    it('returns the packageName', () => {
      expect(result.packageName).toBe('FrontEnd');
    });

    it('calls use case with correct command', () => {
      expect(mockUseCase.execute).toHaveBeenCalledWith({
        name: 'FrontEnd',
        description: undefined,
        originSkill: undefined,
        spaceSlug: undefined,
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
        spaceSlug: 'global',
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
        originSkill: undefined,
        spaceSlug: undefined,
      });
    });
  });

  describe('when creating a package with a specific space', () => {
    let result: Awaited<ReturnType<typeof createPackageHandler>>;

    beforeEach(async () => {
      mockUseCase.execute.mockResolvedValue({
        packageId: 'pkg-789',
        name: 'FrontEnd',
        slug: 'frontend',
        spaceSlug: 'my-team',
      });

      result = await createPackageHandler(
        'FrontEnd',
        undefined,
        mockUseCase,
        undefined,
        'my-team',
      );
    });

    it('returns success', () => {
      expect(result.success).toBe(true);
    });

    it('passes spaceSlug to use case', () => {
      expect(mockUseCase.execute).toHaveBeenCalledWith({
        name: 'FrontEnd',
        description: undefined,
        originSkill: undefined,
        spaceSlug: 'my-team',
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

  describe('when server returns a deduplicated slug', () => {
    let result: Awaited<ReturnType<typeof createPackageHandler>>;

    beforeEach(async () => {
      mockUseCase.execute.mockResolvedValue({
        packageId: 'pkg-999',
        name: 'My Package',
        slug: 'my-package-1',
        spaceSlug: 'global',
      });
      result = await createPackageHandler('My Package', undefined, mockUseCase);
    });

    it('returns deduplicated: true', () => {
      expect(result.deduplicated).toBe(true);
    });

    it('returns success: true', () => {
      expect(result.success).toBe(true);
    });
  });

  describe('when server returns the expected slug', () => {
    let result: Awaited<ReturnType<typeof createPackageHandler>>;

    beforeEach(async () => {
      mockUseCase.execute.mockResolvedValue({
        packageId: 'pkg-001',
        name: 'My Package',
        slug: 'my-package',
        spaceSlug: 'global',
      });
      result = await createPackageHandler('My Package', undefined, mockUseCase);
    });

    it('returns deduplicated as falsy', () => {
      expect(result.deduplicated).toBeFalsy();
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
