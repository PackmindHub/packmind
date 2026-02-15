import { ChangeProposalCaptureMode, ChangeProposalType } from '@packmind/types';

import { SubmitDiffsUseCase } from './SubmitDiffsUseCase';
import { ArtefactDiff } from '../../domain/useCases/IDiffArtefactsUseCase';
import { createMockPackmindGateway } from '../../mocks/createMockGateways';
import { BatchCreateChangeProposalGatewayResponse } from '../../domain/repositories/IChangeProposalGateway';

describe('SubmitDiffsUseCase', () => {
  let useCase: SubmitDiffsUseCase;
  const mockGateway = createMockPackmindGateway();

  const batchResponse = (
    created: number,
    skipped = 0,
  ): BatchCreateChangeProposalGatewayResponse => ({
    created,
    skipped,
    errors: [],
  });

  beforeEach(() => {
    useCase = new SubmitDiffsUseCase(mockGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when groupedDiffs is empty', () => {
    it('returns 0 submitted', async () => {
      const result = await useCase.execute({ groupedDiffs: [] });

      expect(result.submitted).toBe(0);
    });

    it('returns empty skipped array', async () => {
      const result = await useCase.execute({ groupedDiffs: [] });

      expect(result.skipped).toEqual([]);
    });

    it('returns empty errors array', async () => {
      const result = await useCase.execute({ groupedDiffs: [] });

      expect(result.errors).toEqual([]);
    });

    it('returns 0 alreadySubmitted', async () => {
      const result = await useCase.execute({ groupedDiffs: [] });

      expect(result.alreadySubmitted).toBe(0);
    });

    it('does not call batchCreateChangeProposals', async () => {
      await useCase.execute({ groupedDiffs: [] });

      expect(
        mockGateway.changeProposals.batchCreateChangeProposals,
      ).not.toHaveBeenCalled();
    });
  });

  describe('when group contains diffs for the same spaceId', () => {
    const sameSpaceGroup: ArtefactDiff[] = [
      {
        filePath: '.packmind/commands/my-command.md',
        type: ChangeProposalType.updateCommandDescription,
        payload: { oldValue: 'old content', newValue: 'new content' },
        artifactName: 'My Command',
        artifactType: 'command',
        artifactId: 'art-123',
        spaceId: 'spc-456',
      },
      {
        filePath: '.cursor/commands/packmind/my-command.md',
        type: ChangeProposalType.updateCommandDescription,
        payload: { oldValue: 'old content', newValue: 'new content' },
        artifactName: 'My Command',
        artifactType: 'command',
        artifactId: 'art-123',
        spaceId: 'spc-456',
      },
    ];

    beforeEach(() => {
      mockGateway.changeProposals.batchCreateChangeProposals.mockResolvedValue(
        batchResponse(2),
      );
    });

    it('returns created count from batch response', async () => {
      const result = await useCase.execute({
        groupedDiffs: [sameSpaceGroup],
      });

      expect(result.submitted).toBe(2);
    });

    it('calls batchCreateChangeProposals once for the spaceId', async () => {
      await useCase.execute({ groupedDiffs: [sameSpaceGroup] });

      expect(
        mockGateway.changeProposals.batchCreateChangeProposals,
      ).toHaveBeenCalledTimes(1);
    });

    it('sends all diffs in a single batch', async () => {
      await useCase.execute({ groupedDiffs: [sameSpaceGroup] });

      expect(
        mockGateway.changeProposals.batchCreateChangeProposals,
      ).toHaveBeenCalledWith({
        spaceId: 'spc-456',
        proposals: [
          {
            type: ChangeProposalType.updateCommandDescription,
            artefactId: 'art-123',
            payload: { oldValue: 'old content', newValue: 'new content' },
            captureMode: ChangeProposalCaptureMode.commit,
          },
          {
            type: ChangeProposalType.updateCommandDescription,
            artefactId: 'art-123',
            payload: { oldValue: 'old content', newValue: 'new content' },
            captureMode: ChangeProposalCaptureMode.commit,
          },
        ],
      });
    });

    it('returns empty skipped array', async () => {
      const result = await useCase.execute({
        groupedDiffs: [sameSpaceGroup],
      });

      expect(result.skipped).toEqual([]);
    });
  });

  describe('when diffs span multiple spaceIds', () => {
    const spaceAGroup: ArtefactDiff[] = [
      {
        filePath: '.packmind/commands/cmd-a.md',
        type: ChangeProposalType.updateCommandDescription,
        payload: { oldValue: 'old a', newValue: 'new a' },
        artifactName: 'Command A',
        artifactType: 'command',
        artifactId: 'art-a',
        spaceId: 'spc-a',
      },
    ];

    const spaceBGroup: ArtefactDiff[] = [
      {
        filePath: '.packmind/commands/cmd-b.md',
        type: ChangeProposalType.updateCommandDescription,
        payload: { oldValue: 'old b', newValue: 'new b' },
        artifactName: 'Command B',
        artifactType: 'command',
        artifactId: 'art-b',
        spaceId: 'spc-b',
      },
    ];

    beforeEach(() => {
      mockGateway.changeProposals.batchCreateChangeProposals.mockResolvedValue(
        batchResponse(1),
      );
    });

    it('calls batchCreateChangeProposals once per spaceId', async () => {
      await useCase.execute({
        groupedDiffs: [spaceAGroup, spaceBGroup],
      });

      expect(
        mockGateway.changeProposals.batchCreateChangeProposals,
      ).toHaveBeenCalledTimes(2);
    });

    it('aggregates created counts from all batch responses', async () => {
      const result = await useCase.execute({
        groupedDiffs: [spaceAGroup, spaceBGroup],
      });

      expect(result.submitted).toBe(2);
    });
  });

  describe('when group contains a non-command artifact type', () => {
    const standardGroup: ArtefactDiff[] = [
      {
        filePath: '.packmind/standards/my-standard.md',
        type: ChangeProposalType.updateStandardDescription,
        payload: { oldValue: 'old', newValue: 'new' },
        artifactName: 'My Standard',
        artifactType: 'standard',
        artifactId: 'art-std',
        spaceId: 'spc-std',
      },
    ];

    it('returns 0 submitted', async () => {
      const result = await useCase.execute({ groupedDiffs: [standardGroup] });

      expect(result.submitted).toBe(0);
    });

    it('skips with reason "Only commands and skills are supported"', async () => {
      const result = await useCase.execute({ groupedDiffs: [standardGroup] });

      expect(result.skipped).toEqual([
        {
          name: 'My Standard',
          reason: 'Only commands and skills are supported',
        },
      ]);
    });

    it('does not call batchCreateChangeProposals', async () => {
      await useCase.execute({ groupedDiffs: [standardGroup] });

      expect(
        mockGateway.changeProposals.batchCreateChangeProposals,
      ).not.toHaveBeenCalled();
    });
  });

  describe('when group contains a skill artifact type', () => {
    const skillGroup: ArtefactDiff[] = [
      {
        filePath: '.packmind/skills/my-skill/SKILL.md',
        type: ChangeProposalType.updateSkillDescription,
        payload: { oldValue: 'old', newValue: 'new' },
        artifactName: 'My Skill',
        artifactType: 'skill',
        artifactId: 'art-skl',
        spaceId: 'spc-skl',
      },
    ];

    beforeEach(() => {
      mockGateway.changeProposals.batchCreateChangeProposals.mockResolvedValue(
        batchResponse(1),
      );
    });

    it('returns created count from batch response', async () => {
      const result = await useCase.execute({ groupedDiffs: [skillGroup] });

      expect(result.submitted).toBe(1);
    });

    it('sends skill diff with correct type and payload', async () => {
      await useCase.execute({ groupedDiffs: [skillGroup] });

      expect(
        mockGateway.changeProposals.batchCreateChangeProposals,
      ).toHaveBeenCalledWith({
        spaceId: 'spc-skl',
        proposals: [
          {
            type: ChangeProposalType.updateSkillDescription,
            artefactId: 'art-skl',
            payload: { oldValue: 'old', newValue: 'new' },
            captureMode: ChangeProposalCaptureMode.commit,
          },
        ],
      });
    });

    it('returns empty skipped array', async () => {
      const result = await useCase.execute({ groupedDiffs: [skillGroup] });

      expect(result.skipped).toEqual([]);
    });
  });

  describe('when group has diffs with mixed metadata', () => {
    const mixedMetadataGroup: ArtefactDiff[] = [
      {
        filePath: '.packmind/commands/my-command.md',
        type: ChangeProposalType.updateCommandDescription,
        payload: { oldValue: 'old', newValue: 'new' },
        artifactName: 'My Command',
        artifactType: 'command',
        artifactId: 'art-123',
        spaceId: 'spc-456',
      },
      {
        filePath: '.cursor/commands/packmind/my-command.md',
        type: ChangeProposalType.updateCommandDescription,
        payload: { oldValue: 'old cursor', newValue: 'new cursor' },
        artifactName: 'My Command',
        artifactType: 'command',
        artifactId: undefined,
        spaceId: undefined,
      },
      {
        filePath: '.claude/commands/packmind/my-command.md',
        type: ChangeProposalType.updateCommandDescription,
        payload: { oldValue: 'old claude', newValue: 'new claude' },
        artifactName: 'My Command',
        artifactType: 'command',
        artifactId: 'art-123',
        spaceId: 'spc-456',
      },
    ];

    beforeEach(() => {
      mockGateway.changeProposals.batchCreateChangeProposals.mockResolvedValue(
        batchResponse(2),
      );
    });

    it('returns created count from batch response', async () => {
      const result = await useCase.execute({
        groupedDiffs: [mixedMetadataGroup],
      });

      expect(result.submitted).toBe(2);
    });

    it('skips diffs missing metadata', async () => {
      const result = await useCase.execute({
        groupedDiffs: [mixedMetadataGroup],
      });

      expect(result.skipped).toEqual([
        { name: 'My Command', reason: 'Missing artifact metadata' },
      ]);
    });

    it('sends only valid diffs in the batch', async () => {
      await useCase.execute({ groupedDiffs: [mixedMetadataGroup] });

      expect(
        mockGateway.changeProposals.batchCreateChangeProposals,
      ).toHaveBeenCalledWith({
        spaceId: 'spc-456',
        proposals: [
          {
            type: ChangeProposalType.updateCommandDescription,
            artefactId: 'art-123',
            payload: { oldValue: 'old', newValue: 'new' },
            captureMode: ChangeProposalCaptureMode.commit,
          },
          {
            type: ChangeProposalType.updateCommandDescription,
            artefactId: 'art-123',
            payload: { oldValue: 'old claude', newValue: 'new claude' },
            captureMode: ChangeProposalCaptureMode.commit,
          },
        ],
      });
    });
  });

  describe('when diff is missing artifactId', () => {
    const missingArtifactIdGroup: ArtefactDiff[] = [
      {
        filePath: '.packmind/commands/my-command.md',
        type: ChangeProposalType.updateCommandDescription,
        payload: { oldValue: 'old', newValue: 'new' },
        artifactName: 'My Command',
        artifactType: 'command',
        artifactId: undefined,
        spaceId: 'spc-456',
      },
    ];

    it('returns 0 submitted', async () => {
      const result = await useCase.execute({
        groupedDiffs: [missingArtifactIdGroup],
      });

      expect(result.submitted).toBe(0);
    });

    it('skips with reason "Missing artifact metadata"', async () => {
      const result = await useCase.execute({
        groupedDiffs: [missingArtifactIdGroup],
      });

      expect(result.skipped).toEqual([
        { name: 'My Command', reason: 'Missing artifact metadata' },
      ]);
    });

    it('does not call batchCreateChangeProposals', async () => {
      await useCase.execute({ groupedDiffs: [missingArtifactIdGroup] });

      expect(
        mockGateway.changeProposals.batchCreateChangeProposals,
      ).not.toHaveBeenCalled();
    });
  });

  describe('when diff is missing spaceId', () => {
    const missingSpaceIdGroup: ArtefactDiff[] = [
      {
        filePath: '.packmind/commands/my-command.md',
        type: ChangeProposalType.updateCommandDescription,
        payload: { oldValue: 'old', newValue: 'new' },
        artifactName: 'My Command',
        artifactType: 'command',
        artifactId: 'art-123',
        spaceId: undefined,
      },
    ];

    it('returns 0 submitted', async () => {
      const result = await useCase.execute({
        groupedDiffs: [missingSpaceIdGroup],
      });

      expect(result.submitted).toBe(0);
    });

    it('skips with reason "Missing artifact metadata"', async () => {
      const result = await useCase.execute({
        groupedDiffs: [missingSpaceIdGroup],
      });

      expect(result.skipped).toEqual([
        { name: 'My Command', reason: 'Missing artifact metadata' },
      ]);
    });
  });

  describe('when groups contain a mix of valid and invalid entries', () => {
    const validGroup: ArtefactDiff[] = [
      {
        filePath: '.packmind/commands/valid-command.md',
        type: ChangeProposalType.updateCommandDescription,
        payload: { oldValue: 'old', newValue: 'new' },
        artifactName: 'Valid Command',
        artifactType: 'command',
        artifactId: 'art-valid',
        spaceId: 'spc-valid',
      },
    ];

    const standardGroup: ArtefactDiff[] = [
      {
        filePath: '.packmind/standards/a-standard.md',
        type: ChangeProposalType.updateStandardDescription,
        payload: { oldValue: 'old', newValue: 'new' },
        artifactName: 'A Standard',
        artifactType: 'standard',
        artifactId: 'art-std',
        spaceId: 'spc-std',
      },
    ];

    const missingMetadataGroup: ArtefactDiff[] = [
      {
        filePath: '.packmind/commands/no-meta.md',
        type: ChangeProposalType.updateCommandDescription,
        payload: { oldValue: 'old', newValue: 'new' },
        artifactName: 'No Meta Command',
        artifactType: 'command',
        artifactId: undefined,
        spaceId: undefined,
      },
    ];

    beforeEach(() => {
      mockGateway.changeProposals.batchCreateChangeProposals.mockResolvedValue(
        batchResponse(1),
      );
    });

    it('returns correct submitted count', async () => {
      const result = await useCase.execute({
        groupedDiffs: [validGroup, standardGroup, missingMetadataGroup],
      });

      expect(result.submitted).toBe(1);
    });

    it('returns correct skipped entries', async () => {
      const result = await useCase.execute({
        groupedDiffs: [validGroup, standardGroup, missingMetadataGroup],
      });

      expect(result.skipped).toEqual([
        {
          name: 'A Standard',
          reason: 'Only commands and skills are supported',
        },
        { name: 'No Meta Command', reason: 'Missing artifact metadata' },
      ]);
    });
  });

  describe('when group is an empty array', () => {
    it('returns 0 submitted', async () => {
      const result = await useCase.execute({ groupedDiffs: [[]] });

      expect(result.submitted).toBe(0);
    });

    it('returns empty skipped array', async () => {
      const result = await useCase.execute({ groupedDiffs: [[]] });

      expect(result.skipped).toEqual([]);
    });
  });

  describe('when gateway returns errors', () => {
    const commandGroup: ArtefactDiff[] = [
      {
        filePath: '.packmind/commands/cmd-a.md',
        type: ChangeProposalType.updateCommandDescription,
        payload: { oldValue: 'old a', newValue: 'new a' },
        artifactName: 'Command A',
        artifactType: 'command',
        artifactId: 'art-a',
        spaceId: 'spc-a',
      },
      {
        filePath: '.packmind/commands/cmd-b.md',
        type: ChangeProposalType.updateCommandDescription,
        payload: { oldValue: 'old b', newValue: 'new b' },
        artifactName: 'Command B',
        artifactType: 'command',
        artifactId: 'art-b',
        spaceId: 'spc-a',
      },
    ];

    beforeEach(() => {
      mockGateway.changeProposals.batchCreateChangeProposals.mockResolvedValue({
        created: 1,
        skipped: 0,
        errors: [{ index: 1, message: 'Duplicate proposal' }],
      });
    });

    it('maps errors to artifact names using the index', async () => {
      const result = await useCase.execute({ groupedDiffs: [commandGroup] });

      expect(result.errors).toEqual([
        { name: 'Command B', message: 'Duplicate proposal' },
      ]);
    });

    it('returns correct submitted count', async () => {
      const result = await useCase.execute({ groupedDiffs: [commandGroup] });

      expect(result.submitted).toBe(1);
    });
  });

  describe('when gateway returns skipped (already submitted)', () => {
    const commandGroup: ArtefactDiff[] = [
      {
        filePath: '.packmind/commands/cmd-a.md',
        type: ChangeProposalType.updateCommandDescription,
        payload: { oldValue: 'old a', newValue: 'new a' },
        artifactName: 'Command A',
        artifactType: 'command',
        artifactId: 'art-a',
        spaceId: 'spc-a',
      },
      {
        filePath: '.packmind/commands/cmd-b.md',
        type: ChangeProposalType.updateCommandDescription,
        payload: { oldValue: 'old b', newValue: 'new b' },
        artifactName: 'Command B',
        artifactType: 'command',
        artifactId: 'art-b',
        spaceId: 'spc-a',
      },
    ];

    beforeEach(() => {
      mockGateway.changeProposals.batchCreateChangeProposals.mockResolvedValue(
        batchResponse(1, 1),
      );
    });

    it('returns alreadySubmitted count from gateway', async () => {
      const result = await useCase.execute({ groupedDiffs: [commandGroup] });

      expect(result.alreadySubmitted).toBe(1);
    });

    it('returns correct submitted count', async () => {
      const result = await useCase.execute({ groupedDiffs: [commandGroup] });

      expect(result.submitted).toBe(1);
    });
  });
});
