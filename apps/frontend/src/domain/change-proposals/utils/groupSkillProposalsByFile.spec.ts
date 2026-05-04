import { v4 as uuidv4 } from 'uuid';
import {
  ChangeProposal,
  ChangeProposalCaptureMode,
  ChangeProposalStatus,
  ChangeProposalType,
  SkillFile,
  createChangeProposalId,
  createSkillFileId,
  createSkillId,
  createSkillVersionId,
  createSpaceId,
  createUserId,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../types';
import {
  SKILL_MD_PATH,
  UNKNOWN_FILE_PATH,
  getProposalFilePath,
  groupSkillProposalsByFile,
  isBinaryProposal,
} from './groupSkillProposalsByFile';

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
): ChangeProposalWithConflicts =>
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
    conflictsWith: [],
    message: '',
    ...proposal,
  }) as ChangeProposalWithConflicts;

describe('getProposalFilePath', () => {
  const file1 = skillFileFactory({
    id: createSkillFileId('file-1'),
    path: 'src/main.ts',
  });
  const file2 = skillFileFactory({
    id: createSkillFileId('file-2'),
    path: 'config.json',
  });
  const files = [file1, file2];

  it('maps updateSkillName to SKILL.md', () => {
    const proposal = changeProposalFactory({
      type: ChangeProposalType.updateSkillName,
    });
    expect(getProposalFilePath(proposal, files)).toBe(SKILL_MD_PATH);
  });

  it('maps updateSkillDescription to SKILL.md', () => {
    const proposal = changeProposalFactory({
      type: ChangeProposalType.updateSkillDescription,
    });
    expect(getProposalFilePath(proposal, files)).toBe(SKILL_MD_PATH);
  });

  it('maps updateSkillPrompt to SKILL.md', () => {
    const proposal = changeProposalFactory({
      type: ChangeProposalType.updateSkillPrompt,
    });
    expect(getProposalFilePath(proposal, files)).toBe(SKILL_MD_PATH);
  });

  it('maps updateSkillMetadata to SKILL.md', () => {
    const proposal = changeProposalFactory({
      type: ChangeProposalType.updateSkillMetadata,
    });
    expect(getProposalFilePath(proposal, files)).toBe(SKILL_MD_PATH);
  });

  it('maps updateSkillLicense to SKILL.md', () => {
    const proposal = changeProposalFactory({
      type: ChangeProposalType.updateSkillLicense,
    });
    expect(getProposalFilePath(proposal, files)).toBe(SKILL_MD_PATH);
  });

  it('maps updateSkillCompatibility to SKILL.md', () => {
    const proposal = changeProposalFactory({
      type: ChangeProposalType.updateSkillCompatibility,
    });
    expect(getProposalFilePath(proposal, files)).toBe(SKILL_MD_PATH);
  });

  it('maps updateSkillAllowedTools to SKILL.md', () => {
    const proposal = changeProposalFactory({
      type: ChangeProposalType.updateSkillAllowedTools,
    });
    expect(getProposalFilePath(proposal, files)).toBe(SKILL_MD_PATH);
  });

  it('extracts path from addSkillFile payload', () => {
    const proposal = changeProposalFactory({
      type: ChangeProposalType.addSkillFile,
      payload: {
        item: {
          path: 'src/new-file.ts',
          content: 'content',
          permissions: 'read',
          isBase64: false,
        },
      },
    });
    expect(getProposalFilePath(proposal, files)).toBe('src/new-file.ts');
  });

  it('extracts path from deleteSkillFile payload', () => {
    const proposal = changeProposalFactory({
      type: ChangeProposalType.deleteSkillFile,
      payload: {
        targetId: file1.id,
        item: {
          id: file1.id,
          path: 'src/main.ts',
          content: 'content',
          permissions: 'read',
          isBase64: false,
        },
      },
    });
    expect(getProposalFilePath(proposal, files)).toBe('src/main.ts');
  });

  it('looks up file path for updateSkillFileContent by targetId', () => {
    const proposal = changeProposalFactory({
      type: ChangeProposalType.updateSkillFileContent,
      payload: {
        targetId: createSkillFileId('file-2'),
        oldValue: 'old',
        newValue: 'new',
      },
    });
    expect(getProposalFilePath(proposal, files)).toBe('config.json');
  });

  it('looks up file path for updateSkillFilePermissions by targetId', () => {
    const proposal = changeProposalFactory({
      type: ChangeProposalType.updateSkillFilePermissions,
      payload: {
        targetId: createSkillFileId('file-1'),
        oldValue: 'read',
        newValue: 'read-write',
      },
    });
    expect(getProposalFilePath(proposal, files)).toBe('src/main.ts');
  });

  describe('when file is not found', () => {
    it('falls back to unknown file path', () => {
      const proposal = changeProposalFactory({
        type: ChangeProposalType.updateSkillFileContent,
        payload: {
          targetId: createSkillFileId('nonexistent'),
          oldValue: 'old',
          newValue: 'new',
        },
      });
      expect(getProposalFilePath(proposal, files)).toBe(UNKNOWN_FILE_PATH);
    });
  });
});

describe('groupSkillProposalsByFile', () => {
  const file1 = skillFileFactory({
    id: createSkillFileId('file-1'),
    path: 'src/main.ts',
  });
  const file2 = skillFileFactory({
    id: createSkillFileId('file-2'),
    path: 'config.json',
  });
  const files = [file1, file2];

  describe('when grouping scalar and file proposals', () => {
    const nameProposal = changeProposalFactory({
      type: ChangeProposalType.updateSkillName,
      createdAt: new Date('2024-01-01'),
    });
    const descProposal = changeProposalFactory({
      type: ChangeProposalType.updateSkillDescription,
      createdAt: new Date('2024-01-02'),
    });
    const fileContentProposal = changeProposalFactory({
      type: ChangeProposalType.updateSkillFileContent,
      payload: {
        targetId: createSkillFileId('file-1'),
        oldValue: 'old',
        newValue: 'new',
      },
      createdAt: new Date('2024-01-03'),
    });
    const addFileProposal = changeProposalFactory({
      type: ChangeProposalType.addSkillFile,
      payload: {
        item: {
          path: 'docs/readme.md',
          content: '# README',
          permissions: 'read',
          isBase64: false,
        },
      },
      createdAt: new Date('2024-01-04'),
    });

    const proposals = [
      addFileProposal,
      fileContentProposal,
      nameProposal,
      descProposal,
    ];

    let result: ReturnType<typeof groupSkillProposalsByFile>;

    beforeEach(() => {
      result = groupSkillProposalsByFile(
        proposals,
        files,
        new Set(),
        new Set(),
      );
    });

    it('creates three groups', () => {
      expect(result).toHaveLength(3);
    });

    it('places SKILL.md group first', () => {
      expect(result[0].filePath).toBe(SKILL_MD_PATH);
    });

    it('places docs/readme.md second alphabetically', () => {
      expect(result[1].filePath).toBe('docs/readme.md');
    });

    it('places src/main.ts third alphabetically', () => {
      expect(result[2].filePath).toBe('src/main.ts');
    });

    it('groups two scalar proposals under SKILL.md', () => {
      expect(result[0].proposals).toHaveLength(2);
    });

    it('reports correct change count for SKILL.md group', () => {
      expect(result[0].changeCount).toBe(2);
    });

    it('sorts proposals within SKILL.md group oldest first', () => {
      expect(result[0].proposals[0].id).toBe(nameProposal.id);
    });

    it('sorts proposals within SKILL.md group newest last', () => {
      expect(result[0].proposals[1].id).toBe(descProposal.id);
    });
  });

  describe('pending count calculation', () => {
    const p1 = changeProposalFactory({
      type: ChangeProposalType.updateSkillName,
    });
    const p2 = changeProposalFactory({
      type: ChangeProposalType.updateSkillDescription,
    });
    const p3 = changeProposalFactory({
      type: ChangeProposalType.updateSkillPrompt,
    });

    describe('when no decisions are made', () => {
      it('counts all as pending', () => {
        const result = groupSkillProposalsByFile(
          [p1, p2, p3],
          files,
          new Set(),
          new Set(),
        );
        expect(result[0].pendingCount).toBe(3);
      });
    });

    describe('when one proposal is accepted', () => {
      it('excludes it from pending count', () => {
        const result = groupSkillProposalsByFile(
          [p1, p2, p3],
          files,
          new Set([p1.id]),
          new Set(),
        );
        expect(result[0].pendingCount).toBe(2);
      });
    });

    describe('when one proposal is rejected', () => {
      it('excludes it from pending count', () => {
        const result = groupSkillProposalsByFile(
          [p1, p2, p3],
          files,
          new Set(),
          new Set([p2.id]),
        );
        expect(result[0].pendingCount).toBe(2);
      });
    });

    describe('when proposals are both accepted and rejected', () => {
      it('excludes both from pending count', () => {
        const result = groupSkillProposalsByFile(
          [p1, p2, p3],
          files,
          new Set([p1.id]),
          new Set([p2.id]),
        );
        expect(result[0].pendingCount).toBe(1);
      });
    });
  });

  describe('when there are no proposals', () => {
    it('returns an empty array', () => {
      const result = groupSkillProposalsByFile([], files, new Set(), new Set());
      expect(result).toEqual([]);
    });
  });

  describe('when all proposals target the same file', () => {
    const p1 = changeProposalFactory({
      type: ChangeProposalType.updateSkillFileContent,
      payload: {
        targetId: createSkillFileId('file-1'),
        oldValue: 'old1',
        newValue: 'new1',
      },
      createdAt: new Date('2024-01-02'),
    });
    const p2 = changeProposalFactory({
      type: ChangeProposalType.updateSkillFilePermissions,
      payload: {
        targetId: createSkillFileId('file-1'),
        oldValue: 'read',
        newValue: 'read-write',
      },
      createdAt: new Date('2024-01-01'),
    });

    let result: ReturnType<typeof groupSkillProposalsByFile>;

    beforeEach(() => {
      result = groupSkillProposalsByFile([p1, p2], files, new Set(), new Set());
    });

    it('creates a single group', () => {
      expect(result).toHaveLength(1);
    });

    it('uses the correct file path', () => {
      expect(result[0].filePath).toBe('src/main.ts');
    });

    it('includes both proposals in the group', () => {
      expect(result[0].changeCount).toBe(2);
    });

    it('sorts older proposal first', () => {
      expect(result[0].proposals[0].id).toBe(p2.id);
    });

    it('sorts newer proposal last', () => {
      expect(result[0].proposals[1].id).toBe(p1.id);
    });
  });
});

describe('isBinaryProposal', () => {
  describe('when proposal is addSkillFile with isBase64 true', () => {
    it('returns true', () => {
      const proposal = changeProposalFactory({
        type: ChangeProposalType.addSkillFile,
        payload: {
          item: {
            path: 'icon.png',
            content: 'base64content',
            permissions: 'rw-r--r--',
            isBase64: true,
          },
        },
      });
      expect(isBinaryProposal(proposal)).toBe(true);
    });
  });

  describe('when proposal is addSkillFile with isBase64 false', () => {
    it('returns false', () => {
      const proposal = changeProposalFactory({
        type: ChangeProposalType.addSkillFile,
        payload: {
          item: {
            path: 'readme.md',
            content: '# Hello',
            permissions: 'rw-r--r--',
            isBase64: false,
          },
        },
      });
      expect(isBinaryProposal(proposal)).toBe(false);
    });
  });

  describe('when proposal is deleteSkillFile with isBase64 true', () => {
    it('returns true', () => {
      const proposal = changeProposalFactory({
        type: ChangeProposalType.deleteSkillFile,
        payload: {
          targetId: createSkillFileId('file-1'),
          item: {
            id: createSkillFileId('file-1'),
            path: 'doc.pdf',
            content: 'base64content',
            permissions: 'rw-r--r--',
            isBase64: true,
          },
        },
      });
      expect(isBinaryProposal(proposal)).toBe(true);
    });
  });

  describe('when proposal is updateSkillFileContent with isBase64 true', () => {
    it('returns true', () => {
      const proposal = changeProposalFactory({
        type: ChangeProposalType.updateSkillFileContent,
        payload: {
          targetId: createSkillFileId('file-1'),
          oldValue: 'old-base64',
          newValue: 'new-base64',
          isBase64: true,
        },
      });
      expect(isBinaryProposal(proposal)).toBe(true);
    });
  });

  describe('when proposal is updateSkillFileContent without isBase64', () => {
    it('returns false', () => {
      const proposal = changeProposalFactory({
        type: ChangeProposalType.updateSkillFileContent,
        payload: {
          targetId: createSkillFileId('file-1'),
          oldValue: 'old text',
          newValue: 'new text',
        },
      });
      expect(isBinaryProposal(proposal)).toBe(false);
    });
  });

  describe('when proposal is updateSkillFilePermissions', () => {
    it('returns false', () => {
      const proposal = changeProposalFactory({
        type: ChangeProposalType.updateSkillFilePermissions,
        payload: {
          targetId: createSkillFileId('file-1'),
          oldValue: 'read',
          newValue: 'read-write',
        },
      });
      expect(isBinaryProposal(proposal)).toBe(false);
    });
  });

  describe('when proposal is a scalar type', () => {
    it('returns false', () => {
      const proposal = changeProposalFactory({
        type: ChangeProposalType.updateSkillName,
        payload: { oldValue: 'Old', newValue: 'New' },
      });
      expect(isBinaryProposal(proposal)).toBe(false);
    });
  });
});
