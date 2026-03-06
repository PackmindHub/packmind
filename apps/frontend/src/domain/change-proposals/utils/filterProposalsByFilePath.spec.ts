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
import { SKILL_MD_PATH } from './groupSkillProposalsByFile';
import {
  getFilePathsWithChanges,
  filterProposalsByFilePath,
  hasChangesForFilter,
} from './filterProposalsByFilePath';

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

describe('getFilePathsWithChanges', () => {
  const file1 = skillFileFactory({
    id: createSkillFileId('file-1'),
    path: 'src/main.ts',
  });
  const files = [file1];

  describe('when there are scalar and file proposals', () => {
    it('includes SKILL.md for scalar proposals', () => {
      const proposals = [
        changeProposalFactory({ type: ChangeProposalType.updateSkillName }),
      ];
      expect(getFilePathsWithChanges(proposals, files).has(SKILL_MD_PATH)).toBe(
        true,
      );
    });

    it('includes the file path for file proposals', () => {
      const proposals = [
        changeProposalFactory({
          type: ChangeProposalType.updateSkillFileContent,
          payload: {
            targetId: createSkillFileId('file-1'),
            oldValue: 'old',
            newValue: 'new',
          },
        }),
      ];
      expect(getFilePathsWithChanges(proposals, files).has('src/main.ts')).toBe(
        true,
      );
    });

    it('includes the path for addSkillFile proposals', () => {
      const proposals = [
        changeProposalFactory({
          type: ChangeProposalType.addSkillFile,
          payload: {
            item: {
              path: 'src/new-file.ts',
              content: 'content',
              permissions: 'read',
              isBase64: false,
            },
          },
        }),
      ];
      expect(
        getFilePathsWithChanges(proposals, files).has('src/new-file.ts'),
      ).toBe(true);
    });

    it('deduplicates paths from multiple proposals on the same file', () => {
      const proposals = [
        changeProposalFactory({ type: ChangeProposalType.updateSkillName }),
        changeProposalFactory({
          type: ChangeProposalType.updateSkillDescription,
        }),
      ];
      expect(getFilePathsWithChanges(proposals, files).size).toBe(1);
    });
  });

  describe('when there are no proposals', () => {
    it('returns an empty set', () => {
      expect(getFilePathsWithChanges([], files).size).toBe(0);
    });
  });
});

describe('filterProposalsByFilePath', () => {
  const file1 = skillFileFactory({
    id: createSkillFileId('file-1'),
    path: 'src/main.ts',
  });
  const file2 = skillFileFactory({
    id: createSkillFileId('file-2'),
    path: 'src/utils/helper.ts',
  });
  const files = [file1, file2];

  const nameProposal = changeProposalFactory({
    type: ChangeProposalType.updateSkillName,
  });
  const fileContentProposal = changeProposalFactory({
    type: ChangeProposalType.updateSkillFileContent,
    payload: {
      targetId: createSkillFileId('file-1'),
      oldValue: 'old',
      newValue: 'new',
    },
  });
  const helperProposal = changeProposalFactory({
    type: ChangeProposalType.updateSkillFileContent,
    payload: {
      targetId: createSkillFileId('file-2'),
      oldValue: 'old',
      newValue: 'new',
    },
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
  });

  const allProposals = [
    nameProposal,
    fileContentProposal,
    helperProposal,
    addFileProposal,
  ];

  describe('when filter is empty string', () => {
    it('returns all proposals', () => {
      expect(filterProposalsByFilePath(allProposals, files, '')).toHaveLength(
        4,
      );
    });
  });

  describe('when filter is an exact file path', () => {
    it('returns only proposals matching SKILL.md', () => {
      expect(
        filterProposalsByFilePath(allProposals, files, SKILL_MD_PATH),
      ).toHaveLength(1);
    });

    it('returns only proposals matching src/main.ts', () => {
      expect(
        filterProposalsByFilePath(allProposals, files, 'src/main.ts'),
      ).toHaveLength(1);
    });

    it('returns only proposals matching docs/readme.md', () => {
      expect(
        filterProposalsByFilePath(allProposals, files, 'docs/readme.md'),
      ).toHaveLength(1);
    });
  });

  describe('when filter is a directory prefix', () => {
    it('returns proposals for all files under src/', () => {
      expect(
        filterProposalsByFilePath(allProposals, files, 'src'),
      ).toHaveLength(2);
    });

    it('returns proposals for files under src/utils/', () => {
      expect(
        filterProposalsByFilePath(allProposals, files, 'src/utils'),
      ).toHaveLength(1);
    });
  });

  describe('when filter matches no proposals', () => {
    it('returns an empty array', () => {
      expect(
        filterProposalsByFilePath(allProposals, files, 'nonexistent'),
      ).toHaveLength(0);
    });
  });
});

describe('hasChangesForFilter', () => {
  const filePathsWithChanges = new Set([
    SKILL_MD_PATH,
    'src/main.ts',
    'src/utils/helper.ts',
  ]);

  describe('when filter is empty string', () => {
    it('returns true if there are any changes', () => {
      expect(hasChangesForFilter(filePathsWithChanges, '')).toBe(true);
    });

    it('returns false if there are no changes', () => {
      expect(hasChangesForFilter(new Set(), '')).toBe(false);
    });
  });

  describe('when filter is an exact file match', () => {
    it('returns true for a file with changes', () => {
      expect(hasChangesForFilter(filePathsWithChanges, 'src/main.ts')).toBe(
        true,
      );
    });

    it('returns false for a file without changes', () => {
      expect(hasChangesForFilter(filePathsWithChanges, 'config.json')).toBe(
        false,
      );
    });
  });

  describe('when filter is a directory prefix', () => {
    describe('when descendants have changes', () => {
      it('returns true', () => {
        expect(hasChangesForFilter(filePathsWithChanges, 'src')).toBe(true);
      });

      it('returns true for a nested directory', () => {
        expect(hasChangesForFilter(filePathsWithChanges, 'src/utils')).toBe(
          true,
        );
      });
    });

    describe('when no descendants have changes', () => {
      it('returns false', () => {
        expect(hasChangesForFilter(filePathsWithChanges, 'docs')).toBe(false);
      });
    });
  });
});
