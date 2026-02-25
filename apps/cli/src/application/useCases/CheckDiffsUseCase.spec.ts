import {
  ChangeProposalCaptureMode,
  ChangeProposalType,
  CheckChangeProposalsResponse,
} from '@packmind/types';

import { CheckDiffsUseCase } from './CheckDiffsUseCase';
import { ArtefactDiff } from '../../domain/useCases/IDiffArtefactsUseCase';
import {
  createMockChangeProposalGateway,
  createMockPackmindGateway,
} from '../../mocks/createMockGateways';

describe('CheckDiffsUseCase', () => {
  let useCase: CheckDiffsUseCase;
  const mockChangeProposals = createMockChangeProposalGateway();
  const mockGateway = createMockPackmindGateway({
    changeProposals: mockChangeProposals,
  });

  const checkResponse = (
    results: CheckChangeProposalsResponse['results'],
  ): CheckChangeProposalsResponse => ({
    results,
  });

  beforeEach(() => {
    useCase = new CheckDiffsUseCase(mockGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when groupedDiffs is empty', () => {
    it('returns empty results array', async () => {
      const result = await useCase.execute({ groupedDiffs: [] });

      expect(result.results).toEqual([]);
    });

    it('does not call changeProposals.check', async () => {
      await useCase.execute({ groupedDiffs: [] });

      expect(mockChangeProposals.check).not.toHaveBeenCalled();
    });
  });

  describe('when all diffs are invalid', () => {
    const missingArtifactIdDiff: ArtefactDiff = {
      filePath: '.packmind/commands/my-command.md',
      type: ChangeProposalType.updateCommandDescription,
      payload: { oldValue: 'old', newValue: 'new' },
      artifactName: 'My Command',
      artifactType: 'command',
      artifactId: undefined,
      spaceId: 'spc-456',
    };

    const missingSpaceIdDiff: ArtefactDiff = {
      filePath: '.packmind/commands/another-command.md',
      type: ChangeProposalType.updateCommandDescription,
      payload: { oldValue: 'old', newValue: 'new' },
      artifactName: 'Another Command',
      artifactType: 'command',
      artifactId: 'art-123',
      spaceId: undefined,
    };

    const unsupportedTypeDiff: ArtefactDiff = {
      filePath: '.packmind/other/something.md',
      type: ChangeProposalType.updateCommandDescription,
      payload: { oldValue: 'old', newValue: 'new' },
      artifactName: 'Something',
      artifactType: 'unsupported' as ArtefactDiff['artifactType'],
      artifactId: 'art-789',
      spaceId: 'spc-789',
    };

    it('returns exists: false for diff missing artifactId', async () => {
      const result = await useCase.execute({
        groupedDiffs: [
          [missingArtifactIdDiff, missingSpaceIdDiff, unsupportedTypeDiff],
        ],
      });

      expect(result.results[0].exists).toBe(false);
    });

    it('returns exists: false for diff missing spaceId', async () => {
      const result = await useCase.execute({
        groupedDiffs: [
          [missingArtifactIdDiff, missingSpaceIdDiff, unsupportedTypeDiff],
        ],
      });

      expect(result.results[1].exists).toBe(false);
    });

    it('returns exists: false for diff with unsupported artifactType', async () => {
      const result = await useCase.execute({
        groupedDiffs: [
          [missingArtifactIdDiff, missingSpaceIdDiff, unsupportedTypeDiff],
        ],
      });

      expect(result.results[2].exists).toBe(false);
    });

    it('returns createdAt: null for diff missing artifactId', async () => {
      const result = await useCase.execute({
        groupedDiffs: [
          [missingArtifactIdDiff, missingSpaceIdDiff, unsupportedTypeDiff],
        ],
      });

      expect(result.results[0].createdAt).toBeNull();
    });

    it('returns createdAt: null for diff missing spaceId', async () => {
      const result = await useCase.execute({
        groupedDiffs: [
          [missingArtifactIdDiff, missingSpaceIdDiff, unsupportedTypeDiff],
        ],
      });

      expect(result.results[1].createdAt).toBeNull();
    });

    it('returns createdAt: null for diff with unsupported artifactType', async () => {
      const result = await useCase.execute({
        groupedDiffs: [
          [missingArtifactIdDiff, missingSpaceIdDiff, unsupportedTypeDiff],
        ],
      });

      expect(result.results[2].createdAt).toBeNull();
    });

    it('does not call changeProposals.check', async () => {
      await useCase.execute({
        groupedDiffs: [
          [missingArtifactIdDiff, missingSpaceIdDiff, unsupportedTypeDiff],
        ],
      });

      expect(mockChangeProposals.check).not.toHaveBeenCalled();
    });
  });

  describe('when diffs belong to the same spaceId', () => {
    const sameSpaceDiffs: ArtefactDiff[] = [
      {
        filePath: '.packmind/commands/cmd-a.md',
        type: ChangeProposalType.updateCommandDescription,
        payload: { oldValue: 'old a', newValue: 'new a' },
        artifactName: 'Command A',
        artifactType: 'command',
        artifactId: 'art-a',
        spaceId: 'spc-456',
      },
      {
        filePath: '.packmind/commands/cmd-b.md',
        type: ChangeProposalType.updateCommandDescription,
        payload: { oldValue: 'old b', newValue: 'new b' },
        artifactName: 'Command B',
        artifactType: 'command',
        artifactId: 'art-b',
        spaceId: 'spc-456',
      },
    ];

    beforeEach(() => {
      mockChangeProposals.check.mockResolvedValue(
        checkResponse([
          { index: 0, exists: true, createdAt: '2026-01-01T00:00:00Z' },
          { index: 1, exists: false, createdAt: null },
        ]),
      );
    });

    it('calls changeProposals.check once', async () => {
      await useCase.execute({ groupedDiffs: [sameSpaceDiffs] });

      expect(mockChangeProposals.check).toHaveBeenCalledTimes(1);
    });

    it('sends proposals with correct spaceId', async () => {
      await useCase.execute({ groupedDiffs: [sameSpaceDiffs] });

      expect(mockChangeProposals.check).toHaveBeenCalledWith({
        spaceId: 'spc-456',
        proposals: [
          {
            type: ChangeProposalType.updateCommandDescription,
            artefactId: 'art-a',
            payload: { oldValue: 'old a', newValue: 'new a' },
            captureMode: ChangeProposalCaptureMode.commit,
            message: '',
          },
          {
            type: ChangeProposalType.updateCommandDescription,
            artefactId: 'art-b',
            payload: { oldValue: 'old b', newValue: 'new b' },
            captureMode: ChangeProposalCaptureMode.commit,
            message: '',
          },
        ],
      });
    });

    it('maps exists: true for first diff from gateway response', async () => {
      const result = await useCase.execute({
        groupedDiffs: [sameSpaceDiffs],
      });

      expect(result.results[0].exists).toBe(true);
    });

    it('maps exists: false for second diff from gateway response', async () => {
      const result = await useCase.execute({
        groupedDiffs: [sameSpaceDiffs],
      });

      expect(result.results[1].exists).toBe(false);
    });

    it('maps createdAt for first diff from gateway response', async () => {
      const result = await useCase.execute({
        groupedDiffs: [sameSpaceDiffs],
      });

      expect(result.results[0].createdAt).toBe('2026-01-01T00:00:00Z');
    });

    it('maps createdAt: null for second diff from gateway response', async () => {
      const result = await useCase.execute({
        groupedDiffs: [sameSpaceDiffs],
      });

      expect(result.results[1].createdAt).toBeNull();
    });
  });

  describe('when diffs belong to different spaceIds', () => {
    const spaceADiff: ArtefactDiff = {
      filePath: '.packmind/commands/cmd-a.md',
      type: ChangeProposalType.updateCommandDescription,
      payload: { oldValue: 'old a', newValue: 'new a' },
      artifactName: 'Command A',
      artifactType: 'command',
      artifactId: 'art-a',
      spaceId: 'spc-a',
    };

    const spaceBDiff: ArtefactDiff = {
      filePath: '.packmind/standards/std-b.md',
      type: ChangeProposalType.updateStandardName,
      payload: { oldValue: 'old b', newValue: 'new b' },
      artifactName: 'Standard B',
      artifactType: 'standard',
      artifactId: 'art-b',
      spaceId: 'spc-b',
    };

    beforeEach(() => {
      mockChangeProposals.check
        .mockResolvedValueOnce(
          checkResponse([
            { index: 0, exists: true, createdAt: '2026-01-01T00:00:00Z' },
          ]),
        )
        .mockResolvedValueOnce(
          checkResponse([{ index: 0, exists: false, createdAt: null }]),
        );
    });

    it('calls changeProposals.check once per spaceId', async () => {
      await useCase.execute({
        groupedDiffs: [[spaceADiff, spaceBDiff]],
      });

      expect(mockChangeProposals.check).toHaveBeenCalledTimes(2);
    });

    it('returns exists: true for space A diff', async () => {
      const result = await useCase.execute({
        groupedDiffs: [[spaceADiff, spaceBDiff]],
      });

      expect(result.results[0].exists).toBe(true);
    });

    it('returns createdAt for space A diff', async () => {
      const result = await useCase.execute({
        groupedDiffs: [[spaceADiff, spaceBDiff]],
      });

      expect(result.results[0].createdAt).toBe('2026-01-01T00:00:00Z');
    });

    it('returns exists: false for space B diff', async () => {
      const result = await useCase.execute({
        groupedDiffs: [[spaceADiff, spaceBDiff]],
      });

      expect(result.results[1].exists).toBe(false);
    });

    it('returns createdAt: null for space B diff', async () => {
      const result = await useCase.execute({
        groupedDiffs: [[spaceADiff, spaceBDiff]],
      });

      expect(result.results[1].createdAt).toBeNull();
    });
  });

  describe('when mix of valid and invalid diffs', () => {
    const validDiff: ArtefactDiff = {
      filePath: '.packmind/commands/valid-cmd.md',
      type: ChangeProposalType.updateCommandDescription,
      payload: { oldValue: 'old', newValue: 'new' },
      artifactName: 'Valid Command',
      artifactType: 'command',
      artifactId: 'art-valid',
      spaceId: 'spc-valid',
    };

    const invalidDiff: ArtefactDiff = {
      filePath: '.packmind/commands/invalid-cmd.md',
      type: ChangeProposalType.updateCommandDescription,
      payload: { oldValue: 'old', newValue: 'new' },
      artifactName: 'Invalid Command',
      artifactType: 'command',
      artifactId: undefined,
      spaceId: undefined,
    };

    beforeEach(() => {
      mockChangeProposals.check.mockResolvedValue(
        checkResponse([
          { index: 0, exists: true, createdAt: '2026-02-15T00:00:00Z' },
        ]),
      );
    });

    it('calls gateway once for valid diffs', async () => {
      await useCase.execute({
        groupedDiffs: [[invalidDiff, validDiff]],
      });

      expect(mockChangeProposals.check).toHaveBeenCalledTimes(1);
    });

    it('sends only valid diffs to gateway', async () => {
      await useCase.execute({
        groupedDiffs: [[invalidDiff, validDiff]],
      });

      expect(mockChangeProposals.check).toHaveBeenCalledWith({
        spaceId: 'spc-valid',
        proposals: [
          {
            type: ChangeProposalType.updateCommandDescription,
            artefactId: 'art-valid',
            payload: { oldValue: 'old', newValue: 'new' },
            captureMode: ChangeProposalCaptureMode.commit,
            message: '',
          },
        ],
      });
    });

    it('places invalid diff first in results preserving original order', async () => {
      const result = await useCase.execute({
        groupedDiffs: [[invalidDiff, validDiff]],
      });

      expect(result.results[0].diff).toBe(invalidDiff);
    });

    it('places valid diff second in results preserving original order', async () => {
      const result = await useCase.execute({
        groupedDiffs: [[invalidDiff, validDiff]],
      });

      expect(result.results[1].diff).toBe(validDiff);
    });

    it('returns exists: false for invalid diff', async () => {
      const result = await useCase.execute({
        groupedDiffs: [[invalidDiff, validDiff]],
      });

      expect(result.results[0].exists).toBe(false);
    });

    it('returns createdAt: null for invalid diff', async () => {
      const result = await useCase.execute({
        groupedDiffs: [[invalidDiff, validDiff]],
      });

      expect(result.results[0].createdAt).toBeNull();
    });
  });

  describe('when multiple groups are provided', () => {
    const group1: ArtefactDiff[] = [
      {
        filePath: '.packmind/commands/cmd-1.md',
        type: ChangeProposalType.updateCommandDescription,
        payload: { oldValue: 'old 1', newValue: 'new 1' },
        artifactName: 'Command 1',
        artifactType: 'command',
        artifactId: 'art-1',
        spaceId: 'spc-shared',
      },
    ];

    const group2: ArtefactDiff[] = [
      {
        filePath: '.packmind/standards/std-2.md',
        type: ChangeProposalType.updateStandardName,
        payload: { oldValue: 'old 2', newValue: 'new 2' },
        artifactName: 'Standard 2',
        artifactType: 'standard',
        artifactId: 'art-2',
        spaceId: 'spc-shared',
      },
    ];

    beforeEach(() => {
      mockChangeProposals.check.mockResolvedValue(
        checkResponse([
          { index: 0, exists: true, createdAt: '2026-01-01T00:00:00Z' },
          { index: 1, exists: false, createdAt: null },
        ]),
      );
    });

    it('calls check once for shared spaceId across groups', async () => {
      await useCase.execute({ groupedDiffs: [group1, group2] });

      expect(mockChangeProposals.check).toHaveBeenCalledTimes(1);
    });

    it('sends flattened proposals from all groups', async () => {
      await useCase.execute({ groupedDiffs: [group1, group2] });

      expect(mockChangeProposals.check).toHaveBeenCalledWith({
        spaceId: 'spc-shared',
        proposals: [
          {
            type: ChangeProposalType.updateCommandDescription,
            artefactId: 'art-1',
            payload: { oldValue: 'old 1', newValue: 'new 1' },
            captureMode: ChangeProposalCaptureMode.commit,
            message: '',
          },
          {
            type: ChangeProposalType.updateStandardName,
            artefactId: 'art-2',
            payload: { oldValue: 'old 2', newValue: 'new 2' },
            captureMode: ChangeProposalCaptureMode.commit,
            message: '',
          },
        ],
      });
    });

    it('returns first group diff as first result', async () => {
      const result = await useCase.execute({ groupedDiffs: [group1, group2] });

      expect(result.results[0].diff).toBe(group1[0]);
    });

    it('returns second group diff as second result', async () => {
      const result = await useCase.execute({ groupedDiffs: [group1, group2] });

      expect(result.results[1].diff).toBe(group2[0]);
    });
  });
});
