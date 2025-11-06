import { AddTargetUseCase } from './AddTargetUseCase';
import { AddTargetCommand } from '@packmind/shared';
import { TargetService } from '../services/TargetService';
import { createUserId, createOrganizationId } from '@packmind/types';
import { Target, createTargetId, createGitRepoId } from '@packmind/shared';
import { v4 as uuidv4 } from 'uuid';

describe('AddTargetUseCase', () => {
  let useCase: AddTargetUseCase;
  let mockTargetService: jest.Mocked<TargetService>;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());

  beforeEach(() => {
    mockTargetService = {
      addTarget: jest.fn(),
      getTargetsByGitRepoId: jest.fn(),
    } as unknown as jest.Mocked<TargetService>;

    useCase = new AddTargetUseCase(mockTargetService);
  });

  describe('when executing addTarget command', () => {
    it('creates target with valid name and path', async () => {
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: 'production',
        path: '/src/',
        gitRepoId: createGitRepoId(uuidv4()),
      };

      const expectedTarget: Target = {
        id: createTargetId(uuidv4()),
        name: 'production',
        path: '/src/',
        gitRepoId: command.gitRepoId,
      };

      mockTargetService.addTarget.mockResolvedValue(expectedTarget);

      const result = await useCase.execute(command);

      expect(mockTargetService.addTarget).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'production',
          path: '/src/',
          gitRepoId: command.gitRepoId,
        }),
      );
      expect(result).toEqual(expectedTarget);
    });

    it('trims whitespace from target name', async () => {
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: '  production  ',
        path: '/src/',
        gitRepoId: createGitRepoId(uuidv4()),
      };

      const expectedTarget: Target = {
        id: createTargetId(uuidv4()),
        name: 'production',
        path: '/src/',
        gitRepoId: command.gitRepoId,
      };

      mockTargetService.addTarget.mockResolvedValue(expectedTarget);

      await useCase.execute(command);

      expect(mockTargetService.addTarget).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'production',
          path: '/src/',
          gitRepoId: command.gitRepoId,
        }),
      );
    });

    it('accepts root path', async () => {
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: 'default',
        path: '/',
        gitRepoId: createGitRepoId(uuidv4()),
      };

      const expectedTarget: Target = {
        id: createTargetId(uuidv4()),
        name: 'default',
        path: '/',
        gitRepoId: command.gitRepoId,
      };

      mockTargetService.addTarget.mockResolvedValue(expectedTarget);

      await useCase.execute(command);

      expect(mockTargetService.addTarget).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'default',
          path: '/',
          gitRepoId: command.gitRepoId,
        }),
      );
    });

    it('accepts relative paths', async () => {
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: 'frontend',
        path: '/apps/frontend/',
        gitRepoId: createGitRepoId(uuidv4()),
      };

      const expectedTarget: Target = {
        id: createTargetId(uuidv4()),
        name: 'frontend',
        path: '/apps/frontend/',
        gitRepoId: command.gitRepoId,
      };

      mockTargetService.addTarget.mockResolvedValue(expectedTarget);

      await useCase.execute(command);

      expect(mockTargetService.addTarget).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'frontend',
          path: '/apps/frontend/',
          gitRepoId: command.gitRepoId,
        }),
      );
    });
  });

  describe('when validating input', () => {
    it('throws error for empty target name', async () => {
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: '',
        path: '/src/',
        gitRepoId: createGitRepoId(uuidv4()),
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'Target name cannot be empty',
      );

      expect(mockTargetService.addTarget).not.toHaveBeenCalled();
    });

    it('throws error for whitespace-only target name', async () => {
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: '   ',
        path: '/src/',
        gitRepoId: createGitRepoId(uuidv4()),
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'Target name cannot be empty',
      );

      expect(mockTargetService.addTarget).not.toHaveBeenCalled();
    });

    it('throws error for empty path', async () => {
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: 'production',
        path: '',
        gitRepoId: createGitRepoId(uuidv4()),
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'Invalid path format',
      );

      expect(mockTargetService.addTarget).not.toHaveBeenCalled();
    });

    it('throws error for invalid path format', async () => {
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: 'production',
        path: '../invalid',
        gitRepoId: createGitRepoId(uuidv4()),
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'Invalid path format',
      );

      expect(mockTargetService.addTarget).not.toHaveBeenCalled();
    });
  });

  describe('when repository operations fail', () => {
    it('propagates repository errors', async () => {
      const command: AddTargetCommand = {
        userId,
        organizationId,
        name: 'production',
        path: '/src/',
        gitRepoId: createGitRepoId(uuidv4()),
      };

      const repositoryError = new Error('Database connection failed');
      mockTargetService.addTarget.mockRejectedValue(repositoryError);

      await expect(useCase.execute(command)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
