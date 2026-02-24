import { v4 as uuidv4 } from 'uuid';
import {
  ChangeProposal,
  ChangeProposalCaptureMode,
  ChangeProposalStatus,
  ChangeProposalType,
  Skill,
  SkillFile,
  createChangeProposalId,
  createSkillFileId,
  createSkillId,
  createSkillVersionId,
  createSpaceId,
  createUserId,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../types';
import { applySkillProposals } from './applySkillProposals';

const skillFactory = (overrides?: Partial<Skill>): Skill => ({
  id: createSkillId(uuidv4()),
  name: 'Test Skill',
  slug: 'test-skill',
  description: 'Test description',
  prompt: '# Test prompt',
  version: 1,
  license: 'MIT',
  compatibility: 'Claude Code',
  allowedTools: 'Bash, Read',
  metadata: { key1: 'value1' },
  userId: createUserId(uuidv4()),
  spaceId: createSpaceId(uuidv4()),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const skillFileFactory = (overrides?: Partial<SkillFile>): SkillFile => ({
  id: createSkillFileId(uuidv4()),
  skillVersionId: createSkillVersionId(uuidv4()),
  path: 'src/index.ts',
  content: 'console.log("hello");',
  permissions: 'read',
  isBase64: false,
  ...overrides,
});

const changeProposalFactory = (
  proposal?: Partial<ChangeProposal<ChangeProposalType>>,
): ChangeProposal<ChangeProposalType> =>
  ({
    id: createChangeProposalId(uuidv4()),
    type: ChangeProposalType.updateSkillName,
    artefactId: createSkillId(uuidv4()),
    artefactVersion: 1,
    spaceId: createSpaceId(uuidv4()),
    payload: { oldValue: 'Old', newValue: 'New' },
    captureMode: ChangeProposalCaptureMode.commit,
    status: ChangeProposalStatus.pending,
    createdBy: createUserId(uuidv4()),
    resolvedBy: null,
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...proposal,
  }) as ChangeProposal<ChangeProposalType>;

const withConflicts = (
  proposal: ChangeProposal<ChangeProposalType>,
): ChangeProposalWithConflicts => ({
  ...proposal,
  conflictsWith: [],
});

describe('applySkillProposals', () => {
  const skillId = createSkillId(uuidv4());
  const skill = skillFactory({ id: skillId });
  const file1 = skillFileFactory({
    id: createSkillFileId('file-1'),
    path: 'src/main.ts',
    content: 'main content',
    permissions: 'read',
  });
  const file2 = skillFileFactory({
    id: createSkillFileId('file-2'),
    path: 'src/utils.ts',
    content: 'utils content',
    permissions: 'read-write',
  });
  const files = [file1, file2];

  describe('with no proposals', () => {
    let result: ReturnType<typeof applySkillProposals>;

    beforeEach(() => {
      result = applySkillProposals(skill, files, [], new Set());
    });

    it('returns the original skill name', () => {
      expect(result.name).toBe('Test Skill');
    });

    it('returns the original description', () => {
      expect(result.description).toBe('Test description');
    });

    it('returns the original prompt', () => {
      expect(result.prompt).toBe('# Test prompt');
    });

    it('returns the original files', () => {
      expect(result.files).toEqual(files);
    });

    it('does not track name changes', () => {
      expect(result.changes.name).toBeUndefined();
    });

    it('does not track description changes', () => {
      expect(result.changes.description).toBeUndefined();
    });

    it('does not track prompt changes', () => {
      expect(result.changes.prompt).toBeUndefined();
    });

    it('does not track license changes', () => {
      expect(result.changes.license).toBeUndefined();
    });

    it('does not track compatibility changes', () => {
      expect(result.changes.compatibility).toBeUndefined();
    });

    it('does not track allowedTools changes', () => {
      expect(result.changes.allowedTools).toBeUndefined();
    });

    it('does not track metadata changes', () => {
      expect(result.changes.metadata).toBeUndefined();
    });

    it('does not track file additions', () => {
      expect(result.changes.files.added.size).toBe(0);
    });

    it('does not track file content updates', () => {
      expect(result.changes.files.updatedContent.size).toBe(0);
    });

    it('does not track file permission updates', () => {
      expect(result.changes.files.updatedPermissions.size).toBe(0);
    });

    it('does not track file deletions', () => {
      expect(result.changes.files.deleted.size).toBe(0);
    });
  });

  describe('when updating skill name', () => {
    const proposalId = createChangeProposalId(uuidv4());
    let result: ReturnType<typeof applySkillProposals>;

    beforeEach(() => {
      const proposals: ChangeProposalWithConflicts[] = [
        withConflicts(
          changeProposalFactory({
            id: proposalId,
            type: ChangeProposalType.updateSkillName,
            payload: { oldValue: 'Test Skill', newValue: 'Updated Skill' },
            createdAt: new Date('2024-01-01'),
          }),
        ),
      ];
      result = applySkillProposals(
        skill,
        files,
        proposals,
        new Set([proposalId]),
      );
    });

    it('applies the new name', () => {
      expect(result.name).toBe('Updated Skill');
    });

    it('tracks the original value', () => {
      expect(result.changes.name?.originalValue).toBe('Test Skill');
    });

    it('tracks the final value', () => {
      expect(result.changes.name?.finalValue).toBe('Updated Skill');
    });

    it('tracks the proposal ID', () => {
      expect(result.changes.name?.proposalIds).toEqual([proposalId]);
    });
  });

  describe('when updating skill description', () => {
    const proposalId = createChangeProposalId(uuidv4());
    let result: ReturnType<typeof applySkillProposals>;

    beforeEach(() => {
      const proposals: ChangeProposalWithConflicts[] = [
        withConflicts(
          changeProposalFactory({
            id: proposalId,
            type: ChangeProposalType.updateSkillDescription,
            payload: {
              oldValue: 'Test description',
              newValue: 'New description',
            },
            createdAt: new Date('2024-01-01'),
          }),
        ),
      ];
      result = applySkillProposals(
        skill,
        files,
        proposals,
        new Set([proposalId]),
      );
    });

    it('applies the new description', () => {
      expect(result.description).toBe('New description');
    });

    it('tracks the original description value', () => {
      expect(result.changes.description?.originalValue).toBe(
        'Test description',
      );
    });

    it('tracks the final description value', () => {
      expect(result.changes.description?.finalValue).toBe('New description');
    });
  });

  describe('when updating skill prompt', () => {
    const proposalId = createChangeProposalId(uuidv4());
    let result: ReturnType<typeof applySkillProposals>;

    beforeEach(() => {
      const proposals: ChangeProposalWithConflicts[] = [
        withConflicts(
          changeProposalFactory({
            id: proposalId,
            type: ChangeProposalType.updateSkillPrompt,
            payload: { oldValue: '# Test prompt', newValue: '# New prompt' },
            createdAt: new Date('2024-01-01'),
          }),
        ),
      ];
      result = applySkillProposals(
        skill,
        files,
        proposals,
        new Set([proposalId]),
      );
    });

    it('applies the new prompt', () => {
      expect(result.prompt).toBe('# New prompt');
    });

    it('tracks the original prompt value', () => {
      expect(result.changes.prompt?.originalValue).toBe('# Test prompt');
    });

    it('tracks the final prompt value', () => {
      expect(result.changes.prompt?.finalValue).toBe('# New prompt');
    });
  });

  describe('when updating skill license', () => {
    const proposalId = createChangeProposalId(uuidv4());
    let result: ReturnType<typeof applySkillProposals>;

    beforeEach(() => {
      const proposals: ChangeProposalWithConflicts[] = [
        withConflicts(
          changeProposalFactory({
            id: proposalId,
            type: ChangeProposalType.updateSkillLicense,
            payload: { oldValue: 'MIT', newValue: 'Apache-2.0' },
            createdAt: new Date('2024-01-01'),
          }),
        ),
      ];
      result = applySkillProposals(
        skill,
        files,
        proposals,
        new Set([proposalId]),
      );
    });

    it('applies the new license', () => {
      expect(result.license).toBe('Apache-2.0');
    });

    it('tracks the original license value', () => {
      expect(result.changes.license?.originalValue).toBe('MIT');
    });

    it('tracks the final license value', () => {
      expect(result.changes.license?.finalValue).toBe('Apache-2.0');
    });
  });

  describe('when updating skill compatibility', () => {
    const proposalId = createChangeProposalId(uuidv4());
    let result: ReturnType<typeof applySkillProposals>;

    beforeEach(() => {
      const proposals: ChangeProposalWithConflicts[] = [
        withConflicts(
          changeProposalFactory({
            id: proposalId,
            type: ChangeProposalType.updateSkillCompatibility,
            payload: { oldValue: 'Claude Code', newValue: 'Cursor' },
            createdAt: new Date('2024-01-01'),
          }),
        ),
      ];
      result = applySkillProposals(
        skill,
        files,
        proposals,
        new Set([proposalId]),
      );
    });

    it('applies the new compatibility', () => {
      expect(result.compatibility).toBe('Cursor');
    });

    it('tracks the original compatibility value', () => {
      expect(result.changes.compatibility?.originalValue).toBe('Claude Code');
    });

    it('tracks the final compatibility value', () => {
      expect(result.changes.compatibility?.finalValue).toBe('Cursor');
    });
  });

  describe('when updating skill allowedTools', () => {
    const proposalId = createChangeProposalId(uuidv4());
    let result: ReturnType<typeof applySkillProposals>;

    beforeEach(() => {
      const proposals: ChangeProposalWithConflicts[] = [
        withConflicts(
          changeProposalFactory({
            id: proposalId,
            type: ChangeProposalType.updateSkillAllowedTools,
            payload: { oldValue: 'Bash, Read', newValue: 'Bash, Read, Write' },
            createdAt: new Date('2024-01-01'),
          }),
        ),
      ];
      result = applySkillProposals(
        skill,
        files,
        proposals,
        new Set([proposalId]),
      );
    });

    it('applies the new allowedTools', () => {
      expect(result.allowedTools).toBe('Bash, Read, Write');
    });

    it('tracks the original allowedTools value', () => {
      expect(result.changes.allowedTools?.originalValue).toBe('Bash, Read');
    });

    it('tracks the final allowedTools value', () => {
      expect(result.changes.allowedTools?.finalValue).toBe('Bash, Read, Write');
    });
  });

  describe('when updating skill metadata', () => {
    const proposalId = createChangeProposalId(uuidv4());
    let result: ReturnType<typeof applySkillProposals>;

    beforeEach(() => {
      const proposals: ChangeProposalWithConflicts[] = [
        withConflicts(
          changeProposalFactory({
            id: proposalId,
            type: ChangeProposalType.updateSkillMetadata,
            payload: {
              oldValue: JSON.stringify({ key1: 'value1' }),
              newValue: JSON.stringify({ key1: 'updated', key2: 'new' }),
            },
            createdAt: new Date('2024-01-01'),
          }),
        ),
      ];
      result = applySkillProposals(
        skill,
        files,
        proposals,
        new Set([proposalId]),
      );
    });

    it('applies the new metadata', () => {
      expect(result.metadata).toEqual({ key1: 'updated', key2: 'new' });
    });

    it('tracks the metadata change', () => {
      expect(result.changes.metadata).toBeDefined();
    });

    it('tracks the final metadata value', () => {
      expect(result.changes.metadata?.finalValue).toBe(
        JSON.stringify({ key1: 'updated', key2: 'new' }),
      );
    });
  });

  describe('when adding a skill file', () => {
    const proposalId = createChangeProposalId(uuidv4());
    let result: ReturnType<typeof applySkillProposals>;

    beforeEach(() => {
      const proposals: ChangeProposalWithConflicts[] = [
        withConflicts(
          changeProposalFactory({
            id: proposalId,
            type: ChangeProposalType.addSkillFile,
            payload: {
              item: {
                path: 'src/new-file.ts',
                content: 'new file content',
                permissions: 'read',
                isBase64: false,
              },
            },
            createdAt: new Date('2024-01-01'),
          }),
        ),
      ];
      result = applySkillProposals(
        skill,
        files,
        proposals,
        new Set([proposalId]),
      );
    });

    it('adds the new file', () => {
      expect(result.files).toHaveLength(3);
    });

    it('includes the new file with correct content', () => {
      const newFile = result.files.find((f) => f.path === 'src/new-file.ts');
      expect(newFile?.content).toBe('new file content');
    });

    it('tracks the file addition count', () => {
      expect(result.changes.files.added.size).toBe(1);
    });

    it('associates the addition with the proposal', () => {
      expect(result.changes.files.added.get('src/new-file.ts')).toBe(
        proposalId,
      );
    });
  });

  describe('when updating file content', () => {
    const proposalId = createChangeProposalId(uuidv4());
    const targetId = createSkillFileId('file-1');
    let result: ReturnType<typeof applySkillProposals>;

    beforeEach(() => {
      const proposals: ChangeProposalWithConflicts[] = [
        withConflicts(
          changeProposalFactory({
            id: proposalId,
            type: ChangeProposalType.updateSkillFileContent,
            payload: {
              targetId,
              oldValue: 'main content',
              newValue: 'updated main content',
            },
            createdAt: new Date('2024-01-01'),
          }),
        ),
      ];
      result = applySkillProposals(
        skill,
        files,
        proposals,
        new Set([proposalId]),
      );
    });

    it('updates the file content', () => {
      const updatedFile = result.files.find((f) => f.id === targetId);
      expect(updatedFile?.content).toBe('updated main content');
    });

    it('tracks the original content', () => {
      const contentChange = result.changes.files.updatedContent.get(targetId);
      expect(contentChange?.originalValue).toBe('main content');
    });

    it('tracks the final content', () => {
      const contentChange = result.changes.files.updatedContent.get(targetId);
      expect(contentChange?.finalValue).toBe('updated main content');
    });

    it('tracks the proposal ID for the content update', () => {
      const contentChange = result.changes.files.updatedContent.get(targetId);
      expect(contentChange?.proposalIds).toEqual([proposalId]);
    });
  });

  describe('when updating file permissions', () => {
    const proposalId = createChangeProposalId(uuidv4());
    const targetId = createSkillFileId('file-1');
    let result: ReturnType<typeof applySkillProposals>;

    beforeEach(() => {
      const proposals: ChangeProposalWithConflicts[] = [
        withConflicts(
          changeProposalFactory({
            id: proposalId,
            type: ChangeProposalType.updateSkillFilePermissions,
            payload: {
              targetId,
              oldValue: 'read',
              newValue: 'read-write',
            },
            createdAt: new Date('2024-01-01'),
          }),
        ),
      ];
      result = applySkillProposals(
        skill,
        files,
        proposals,
        new Set([proposalId]),
      );
    });

    it('updates the file permissions', () => {
      const updatedFile = result.files.find((f) => f.id === targetId);
      expect(updatedFile?.permissions).toBe('read-write');
    });

    it('tracks the original permissions', () => {
      const permChange = result.changes.files.updatedPermissions.get(targetId);
      expect(permChange?.originalValue).toBe('read');
    });

    it('tracks the final permissions', () => {
      const permChange = result.changes.files.updatedPermissions.get(targetId);
      expect(permChange?.finalValue).toBe('read-write');
    });
  });

  describe('when deleting a skill file', () => {
    const proposalId = createChangeProposalId(uuidv4());
    const targetId = createSkillFileId('file-1');
    let result: ReturnType<typeof applySkillProposals>;

    beforeEach(() => {
      const proposals: ChangeProposalWithConflicts[] = [
        withConflicts(
          changeProposalFactory({
            id: proposalId,
            type: ChangeProposalType.deleteSkillFile,
            payload: {
              targetId,
              item: {
                id: targetId,
                path: 'src/main.ts',
                content: 'main content',
                permissions: 'read',
                isBase64: false,
              },
            },
            createdAt: new Date('2024-01-01'),
          }),
        ),
      ];
      result = applySkillProposals(
        skill,
        files,
        proposals,
        new Set([proposalId]),
      );
    });

    it('removes the file', () => {
      expect(result.files).toHaveLength(1);
    });

    it('does not include the deleted file', () => {
      expect(result.files.find((f) => f.id === targetId)).toBeUndefined();
    });

    it('tracks the file deletion', () => {
      expect(result.changes.files.deleted.has(targetId)).toBe(true);
    });
  });

  describe('when applying proposals in chronological order', () => {
    const proposal1Id = createChangeProposalId(uuidv4());
    const proposal2Id = createChangeProposalId(uuidv4());
    let result: ReturnType<typeof applySkillProposals>;

    beforeEach(() => {
      // Proposals listed in reverse order, should still apply oldest first
      const proposals: ChangeProposalWithConflicts[] = [
        withConflicts(
          changeProposalFactory({
            id: proposal2Id,
            type: ChangeProposalType.updateSkillName,
            payload: { oldValue: 'First', newValue: 'Second' },
            createdAt: new Date('2024-01-02'),
          }),
        ),
        withConflicts(
          changeProposalFactory({
            id: proposal1Id,
            type: ChangeProposalType.updateSkillName,
            payload: { oldValue: 'Test Skill', newValue: 'First' },
            createdAt: new Date('2024-01-01'),
          }),
        ),
      ];
      result = applySkillProposals(
        skill,
        files,
        proposals,
        new Set([proposal1Id, proposal2Id]),
      );
    });

    it('applies proposals sorted by createdAt', () => {
      expect(result.name).toBe('Second');
    });

    it('tracks all proposal IDs in chronological order', () => {
      expect(result.changes.name?.proposalIds).toEqual([
        proposal1Id,
        proposal2Id,
      ]);
    });

    it('tracks the original value from the initial state', () => {
      expect(result.changes.name?.originalValue).toBe('Test Skill');
    });
  });

  describe('when adding then deleting the same file (cancellation)', () => {
    const addProposalId = createChangeProposalId(uuidv4());
    const deleteProposalId = createChangeProposalId(uuidv4());
    let result: ReturnType<typeof applySkillProposals>;

    beforeEach(() => {
      const proposals: ChangeProposalWithConflicts[] = [
        withConflicts(
          changeProposalFactory({
            id: addProposalId,
            type: ChangeProposalType.addSkillFile,
            payload: {
              item: {
                path: 'src/temp.ts',
                content: 'temp content',
                permissions: 'read',
                isBase64: false,
              },
            },
            createdAt: new Date('2024-01-01'),
          }),
        ),
        withConflicts(
          changeProposalFactory({
            id: deleteProposalId,
            type: ChangeProposalType.deleteSkillFile,
            payload: {
              targetId: createSkillFileId(''),
              item: {
                id: createSkillFileId(''),
                path: 'src/temp.ts',
                content: 'temp content',
                permissions: 'read',
                isBase64: false,
              },
            },
            createdAt: new Date('2024-01-02'),
          }),
        ),
      ];

      // First apply just the add to get the generated file ID
      const addResult = applySkillProposals(
        skill,
        files,
        [proposals[0]],
        new Set([addProposalId]),
      );
      const addedFile = addResult.files.find((f) => f.path === 'src/temp.ts');

      // Update the delete proposal to target the correct file ID
      if (addedFile) {
        (proposals[1] as ChangeProposalWithConflicts).payload = {
          targetId: addedFile.id,
          item: {
            id: addedFile.id,
            path: 'src/temp.ts',
            content: 'temp content',
            permissions: 'read',
            isBase64: false,
          },
        };
      }

      result = applySkillProposals(
        skill,
        files,
        proposals,
        new Set([addProposalId, deleteProposalId]),
      );
    });

    it('cancels both add and delete', () => {
      expect(result.files).toHaveLength(2);
    });

    it('does not track the addition', () => {
      expect(result.changes.files.added.size).toBe(0);
    });

    it('does not track the deletion', () => {
      expect(result.changes.files.deleted.size).toBe(0);
    });
  });

  describe('when applying mixed proposal types', () => {
    const nameProposalId = createChangeProposalId(uuidv4());
    const promptProposalId = createChangeProposalId(uuidv4());
    const addFileProposalId = createChangeProposalId(uuidv4());
    const updateContentProposalId = createChangeProposalId(uuidv4());
    const targetFileId = createSkillFileId('file-1');
    let result: ReturnType<typeof applySkillProposals>;

    beforeEach(() => {
      const proposals: ChangeProposalWithConflicts[] = [
        withConflicts(
          changeProposalFactory({
            id: nameProposalId,
            type: ChangeProposalType.updateSkillName,
            payload: { oldValue: 'Test Skill', newValue: 'Mixed Skill' },
            createdAt: new Date('2024-01-01'),
          }),
        ),
        withConflicts(
          changeProposalFactory({
            id: promptProposalId,
            type: ChangeProposalType.updateSkillPrompt,
            payload: { oldValue: '# Test prompt', newValue: '# New prompt' },
            createdAt: new Date('2024-01-02'),
          }),
        ),
        withConflicts(
          changeProposalFactory({
            id: addFileProposalId,
            type: ChangeProposalType.addSkillFile,
            payload: {
              item: {
                path: 'src/added.ts',
                content: 'added',
                permissions: 'read',
                isBase64: false,
              },
            },
            createdAt: new Date('2024-01-03'),
          }),
        ),
        withConflicts(
          changeProposalFactory({
            id: updateContentProposalId,
            type: ChangeProposalType.updateSkillFileContent,
            payload: {
              targetId: targetFileId,
              oldValue: 'main content',
              newValue: 'updated main',
            },
            createdAt: new Date('2024-01-04'),
          }),
        ),
      ];
      result = applySkillProposals(
        skill,
        files,
        proposals,
        new Set([
          nameProposalId,
          promptProposalId,
          addFileProposalId,
          updateContentProposalId,
        ]),
      );
    });

    it('applies the name change', () => {
      expect(result.name).toBe('Mixed Skill');
    });

    it('applies the prompt change', () => {
      expect(result.prompt).toBe('# New prompt');
    });

    it('adds the new file', () => {
      expect(result.files).toHaveLength(3);
    });

    it('updates the file content', () => {
      const updated = result.files.find((f) => f.id === targetFileId);
      expect(updated?.content).toBe('updated main');
    });

    it('tracks the name change', () => {
      expect(result.changes.name).toBeDefined();
    });

    it('tracks the prompt change', () => {
      expect(result.changes.prompt).toBeDefined();
    });

    it('tracks the file addition', () => {
      expect(result.changes.files.added.size).toBe(1);
    });

    it('tracks the file content update', () => {
      expect(result.changes.files.updatedContent.size).toBe(1);
    });
  });

  describe('with non-accepted proposals', () => {
    const proposalId = createChangeProposalId(uuidv4());
    let result: ReturnType<typeof applySkillProposals>;

    beforeEach(() => {
      const proposals: ChangeProposalWithConflicts[] = [
        withConflicts(
          changeProposalFactory({
            id: proposalId,
            type: ChangeProposalType.updateSkillName,
            payload: { oldValue: 'Test Skill', newValue: 'Should Not Apply' },
            createdAt: new Date('2024-01-01'),
          }),
        ),
      ];
      result = applySkillProposals(skill, files, proposals, new Set());
    });

    it('does not apply non-accepted proposals', () => {
      expect(result.name).toBe('Test Skill');
    });

    it('does not track changes for non-accepted proposals', () => {
      expect(result.changes.name).toBeUndefined();
    });
  });
});
