import { ChangeProposalCaptureMode, ChangeProposalType } from '@packmind/types';

import { SubmitDiffsUseCase } from './SubmitDiffsUseCase';
import { ArtefactDiff } from '../../domain/useCases/IDiffArtefactsUseCase';
import { createMockPackmindGateway } from '../../mocks/createMockGateways';

describe('SubmitDiffsUseCase', () => {
  let useCase: SubmitDiffsUseCase;
  const mockGateway = createMockPackmindGateway();

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
  });

  describe('when group contains duplicate diffs across agent files', () => {
    const duplicateDiffGroup: ArtefactDiff[] = [
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
      mockGateway.changeProposals.createChangeProposal.mockResolvedValue(
        undefined,
      );
    });

    it('submits only one change proposal', async () => {
      const result = await useCase.execute({
        groupedDiffs: [duplicateDiffGroup],
      });

      expect(result.submitted).toBe(1);
    });

    it('returns empty skipped array', async () => {
      const result = await useCase.execute({
        groupedDiffs: [duplicateDiffGroup],
      });

      expect(result.skipped).toEqual([]);
    });

    it('calls createChangeProposal once', async () => {
      await useCase.execute({ groupedDiffs: [duplicateDiffGroup] });

      expect(
        mockGateway.changeProposals.createChangeProposal,
      ).toHaveBeenCalledTimes(1);
    });

    it('calls createChangeProposal with correct spaceId', async () => {
      await useCase.execute({ groupedDiffs: [duplicateDiffGroup] });

      expect(
        mockGateway.changeProposals.createChangeProposal,
      ).toHaveBeenCalledWith(expect.objectContaining({ spaceId: 'spc-456' }));
    });

    it('calls createChangeProposal with updateCommandDescription type', async () => {
      await useCase.execute({ groupedDiffs: [duplicateDiffGroup] });

      expect(
        mockGateway.changeProposals.createChangeProposal,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ChangeProposalType.updateCommandDescription,
        }),
      );
    });

    it('calls createChangeProposal with correct artefactId', async () => {
      await useCase.execute({ groupedDiffs: [duplicateDiffGroup] });

      expect(
        mockGateway.changeProposals.createChangeProposal,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ artefactId: 'art-123' }),
      );
    });

    it('calls createChangeProposal with commit capture mode', async () => {
      await useCase.execute({ groupedDiffs: [duplicateDiffGroup] });

      expect(
        mockGateway.changeProposals.createChangeProposal,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          captureMode: ChangeProposalCaptureMode.commit,
        }),
      );
    });
  });

  describe('when group contains diffs with same artifactId but different payloads', () => {
    const differentPayloadGroup: ArtefactDiff[] = [
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
        payload: { oldValue: 'old content', newValue: 'different edit' },
        artifactName: 'My Command',
        artifactType: 'command',
        artifactId: 'art-123',
        spaceId: 'spc-456',
      },
    ];

    beforeEach(() => {
      mockGateway.changeProposals.createChangeProposal.mockResolvedValue(
        undefined,
      );
    });

    it('submits both diffs', async () => {
      const result = await useCase.execute({
        groupedDiffs: [differentPayloadGroup],
      });

      expect(result.submitted).toBe(2);
    });

    it('calls createChangeProposal for each diff', async () => {
      await useCase.execute({ groupedDiffs: [differentPayloadGroup] });

      expect(
        mockGateway.changeProposals.createChangeProposal,
      ).toHaveBeenCalledTimes(2);
    });
  });

  describe('when group has no .packmind/ diff but valid agent diffs with identical payloads', () => {
    const agentOnlyGroup: ArtefactDiff[] = [
      {
        filePath: '.cursor/commands/packmind/my-command.md',
        type: ChangeProposalType.updateCommandDescription,
        payload: { oldValue: 'old content', newValue: 'new content' },
        artifactName: 'My Command',
        artifactType: 'command',
        artifactId: 'art-123',
        spaceId: 'spc-456',
      },
      {
        filePath: '.github/prompts/my-command.prompt.md',
        type: ChangeProposalType.updateCommandDescription,
        payload: { oldValue: 'old content', newValue: 'new content' },
        artifactName: 'My Command',
        artifactType: 'command',
        artifactId: 'art-123',
        spaceId: 'spc-456',
      },
    ];

    beforeEach(() => {
      mockGateway.changeProposals.createChangeProposal.mockResolvedValue(
        undefined,
      );
    });

    it('submits only one change proposal', async () => {
      const result = await useCase.execute({
        groupedDiffs: [agentOnlyGroup],
      });

      expect(result.submitted).toBe(1);
    });

    it('returns empty skipped array', async () => {
      const result = await useCase.execute({
        groupedDiffs: [agentOnlyGroup],
      });

      expect(result.skipped).toEqual([]);
    });

    it('calls createChangeProposal once', async () => {
      await useCase.execute({ groupedDiffs: [agentOnlyGroup] });

      expect(
        mockGateway.changeProposals.createChangeProposal,
      ).toHaveBeenCalledTimes(1);
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

    it('skips with reason "Only commands are supported"', async () => {
      const result = await useCase.execute({ groupedDiffs: [standardGroup] });

      expect(result.skipped).toEqual([
        { name: 'My Standard', reason: 'Only commands are supported' },
      ]);
    });

    it('does not call createChangeProposal', async () => {
      await useCase.execute({ groupedDiffs: [standardGroup] });

      expect(
        mockGateway.changeProposals.createChangeProposal,
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

    it('skips with reason "Only commands are supported"', async () => {
      const result = await useCase.execute({ groupedDiffs: [skillGroup] });

      expect(result.skipped).toEqual([
        { name: 'My Skill', reason: 'Only commands are supported' },
      ]);
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
      mockGateway.changeProposals.createChangeProposal.mockResolvedValue(
        undefined,
      );
    });

    it('submits only valid diffs', async () => {
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

    it('calls createChangeProposal only for valid diffs', async () => {
      await useCase.execute({ groupedDiffs: [mixedMetadataGroup] });

      expect(
        mockGateway.changeProposals.createChangeProposal,
      ).toHaveBeenCalledTimes(2);
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

    it('does not call createChangeProposal', async () => {
      await useCase.execute({ groupedDiffs: [missingArtifactIdGroup] });

      expect(
        mockGateway.changeProposals.createChangeProposal,
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
      mockGateway.changeProposals.createChangeProposal.mockResolvedValue(
        undefined,
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
        { name: 'A Standard', reason: 'Only commands are supported' },
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
});
