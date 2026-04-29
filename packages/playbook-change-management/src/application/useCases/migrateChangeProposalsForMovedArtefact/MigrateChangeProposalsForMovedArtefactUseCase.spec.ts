import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  MigrateChangeProposalsForMovedArtefactCommand,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { MigrateChangeProposalsForMovedArtefactUseCase } from './MigrateChangeProposalsForMovedArtefactUseCase';

describe('MigrateChangeProposalsForMovedArtefactUseCase', () => {
  let useCase: MigrateChangeProposalsForMovedArtefactUseCase;
  let changeProposalService: jest.Mocked<ChangeProposalService>;

  const userId = createUserId('user-1');
  const organizationId = createOrganizationId('org-1');
  const sourceSpaceId = createSpaceId('source-space');
  const destinationSpaceId = createSpaceId('dest-space');

  const buildCommand = (): MigrateChangeProposalsForMovedArtefactCommand => ({
    userId: userId as unknown as string,
    organizationId: organizationId as unknown as string,
    sourceSpaceId,
    destinationSpaceId,
    oldArtefactId: 'old-artefact-id',
    newArtefactId: 'new-artefact-id',
  });

  beforeEach(() => {
    changeProposalService = {
      migrateProposalsForMovedArtefact: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ChangeProposalService>;

    useCase = new MigrateChangeProposalsForMovedArtefactUseCase(
      changeProposalService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to changeProposalService with correct parameters', async () => {
    const command = buildCommand();

    await useCase.execute(command);

    expect(
      changeProposalService.migrateProposalsForMovedArtefact,
    ).toHaveBeenCalledWith({
      sourceSpaceId,
      destinationSpaceId,
      oldArtefactId: 'old-artefact-id',
      newArtefactId: 'new-artefact-id',
    });
  });

  it('returns an empty response', async () => {
    const result = await useCase.execute(buildCommand());

    expect(result).toEqual({});
  });

  describe('when the service throws', () => {
    it('propagates the error', async () => {
      changeProposalService.migrateProposalsForMovedArtefact.mockRejectedValueOnce(
        new Error('DB error'),
      );

      await expect(useCase.execute(buildCommand())).rejects.toThrow('DB error');
    });
  });
});
