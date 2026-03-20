import { SkillChangeProposalApplier } from './SkillChangeProposalApplier';
import { DiffService } from './DiffService';
import { ChangeProposalConflictError } from './ChangeProposalConflictError';
import { ChangeProposalPayloadParseError } from './ChangeProposalPayloadParseError';
import { SkillVersionWithFiles } from './types';
import { v4 as uuidv4 } from 'uuid';
import { createChangeProposalFactory } from './testHelpers';
import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalType } from '../ChangeProposalType';
import { createSkillId } from '../../skills/SkillId';
import { createSkillVersionId } from '../../skills/SkillVersionId';
import { createSkillFileId } from '../../skills/SkillFileId';
import { SkillFile } from '../../skills/SkillFile';
import { createUserId } from '../../accounts/User';

const changeProposalFactory = createChangeProposalFactory(createSkillId);

const skillVersionFactory = (
  overrides?: Partial<SkillVersionWithFiles>,
): SkillVersionWithFiles => ({
  id: createSkillVersionId(uuidv4()),
  skillId: createSkillId(uuidv4()),
  version: 1,
  userId: createUserId(uuidv4()),
  name: 'Test Skill',
  slug: 'test-skill',
  description: 'A test description',
  prompt: 'Test prompt',
  files: [],
  ...overrides,
});

const skillFileFactory = (overrides?: Partial<SkillFile>): SkillFile => ({
  id: createSkillFileId(uuidv4()),
  skillVersionId: createSkillVersionId(uuidv4()),
  path: 'test-file.txt',
  content: 'file content',
  permissions: 'read',
  isBase64: false,
  ...overrides,
});

describe('SkillChangeProposalApplier', () => {
  const diffService = new DiffService();
  const applier = new SkillChangeProposalApplier(diffService);

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('areChangesApplicable', () => {
    it('returns true for skill change types', () => {
      const proposals = [
        changeProposalFactory({
          type: ChangeProposalType.updateSkillName,
          payload: { oldValue: 'Old', newValue: 'New' },
        }),
      ];

      expect(applier.areChangesApplicable(proposals as ChangeProposal[])).toBe(
        true,
      );
    });

    it('returns false for non-skill change types', () => {
      const proposals = [
        changeProposalFactory({
          type: ChangeProposalType.updateStandardName,
          payload: { oldValue: 'Old', newValue: 'New' },
        }),
      ];

      expect(applier.areChangesApplicable(proposals as ChangeProposal[])).toBe(
        false,
      );
    });
  });

  describe('applyChangeProposals', () => {
    describe('updateSkillName', () => {
      it('overrides the name with the new value', () => {
        const source = skillVersionFactory({ name: 'Original Name' });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateSkillName,
          payload: { oldValue: 'Original Name', newValue: 'Updated Name' },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect(result.version.name).toBe('Updated Name');
      });
    });

    describe('updateSkillDescription', () => {
      it('applies diff to the description', () => {
        const source = skillVersionFactory({
          description: 'line1\nline2\nline3',
        });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateSkillDescription,
          payload: {
            oldValue: 'line1\nline2\nline3',
            newValue: 'line1\nmodified\nline3',
          },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect(result.version.description).toBe('line1\nmodified\nline3');
      });

      it('throws ChangeProposalConflictError on conflict', () => {
        const source = skillVersionFactory({
          description: 'line1\nchanged-by-someone\nline3',
        });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateSkillDescription,
          payload: {
            oldValue: 'line1\noriginal\nline3',
            newValue: 'line1\nchanged-by-proposal\nline3',
          },
        });

        expect(() =>
          applier.applyChangeProposals(source, [proposal as ChangeProposal]),
        ).toThrow(ChangeProposalConflictError);
      });
    });

    describe('updateSkillPrompt', () => {
      it('applies diff to the prompt', () => {
        const source = skillVersionFactory({
          prompt: 'line1\nline2\nline3',
        });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateSkillPrompt,
          payload: {
            oldValue: 'line1\nline2\nline3',
            newValue: 'line1\nupdated-prompt\nline3',
          },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect(result.version.prompt).toBe('line1\nupdated-prompt\nline3');
      });

      it('throws ChangeProposalConflictError on conflict', () => {
        const source = skillVersionFactory({
          prompt: 'line1\nchanged-by-someone\nline3',
        });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateSkillPrompt,
          payload: {
            oldValue: 'line1\noriginal\nline3',
            newValue: 'line1\nchanged-by-proposal\nline3',
          },
        });

        expect(() =>
          applier.applyChangeProposals(source, [proposal as ChangeProposal]),
        ).toThrow(ChangeProposalConflictError);
      });
    });

    describe('updateSkillMetadata', () => {
      it('parses and sets metadata from JSON string', () => {
        const source = skillVersionFactory({
          metadata: { key: 'old-value' },
        });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateSkillMetadata,
          payload: {
            oldValue: JSON.stringify({ key: 'old-value' }),
            newValue: JSON.stringify({ key: 'new-value' }),
          },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect(result.version.metadata).toEqual({ key: 'new-value' });
      });

      describe('when newValue is malformed JSON', () => {
        it('throws ChangeProposalPayloadParseError', () => {
          const source = skillVersionFactory({
            metadata: { key: 'old-value' },
          });
          const proposal = changeProposalFactory({
            type: ChangeProposalType.updateSkillMetadata,
            payload: {
              oldValue: JSON.stringify({ key: 'old-value' }),
              newValue: '{not valid json',
            },
          });

          expect(() =>
            applier.applyChangeProposals(source, [
              proposal as ChangeProposal,
            ]),
          ).toThrow(ChangeProposalPayloadParseError);
        });
      });

      describe('when newValue is empty', () => {
        it('sets metadata to undefined', () => {
          const source = skillVersionFactory({
            metadata: { key: 'value' },
          });
          const proposal = changeProposalFactory({
            type: ChangeProposalType.updateSkillMetadata,
            payload: {
              oldValue: JSON.stringify({ key: 'value' }),
              newValue: '',
            },
          });

          const result = applier.applyChangeProposals(source, [
            proposal as ChangeProposal,
          ]);

          expect(result.version.metadata).toBeUndefined();
        });
      });
    });

    describe('updateSkillLicense', () => {
      it('overrides the license with the new value', () => {
        const source = skillVersionFactory({ license: 'MIT' });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateSkillLicense,
          payload: { oldValue: 'MIT', newValue: 'Apache-2.0' },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect(result.version.license).toBe('Apache-2.0');
      });
    });

    describe('updateSkillCompatibility', () => {
      it('overrides the compatibility with the new value', () => {
        const source = skillVersionFactory({ compatibility: 'v1' });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateSkillCompatibility,
          payload: { oldValue: 'v1', newValue: 'v2' },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect(result.version.compatibility).toBe('v2');
      });
    });

    describe('updateSkillAllowedTools', () => {
      it('overrides the allowedTools with the new value', () => {
        const source = skillVersionFactory({ allowedTools: 'tool1' });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateSkillAllowedTools,
          payload: { oldValue: 'tool1', newValue: 'tool1,tool2' },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect(result.version.allowedTools).toBe('tool1,tool2');
      });
    });

    describe('addSkillFile', () => {
      describe('when adding a file to an empty skill', () => {
        let result: ReturnType<typeof applier.applyChangeProposals>;
        let source: ReturnType<typeof skillVersionFactory>;

        beforeEach(() => {
          source = skillVersionFactory({ files: [] });
          const proposal = changeProposalFactory({
            type: ChangeProposalType.addSkillFile,
            payload: {
              item: {
                path: 'new-file.txt',
                content: 'new content',
                permissions: 'read',
                isBase64: false,
              },
            },
          });

          result = applier.applyChangeProposals(source, [
            proposal as ChangeProposal,
          ]);
        });

        it('creates one file', () => {
          expect(result.version.files).toHaveLength(1);
        });

        it('sets the file path', () => {
          expect(result.version.files[0].path).toBe('new-file.txt');
        });

        it('sets the file content', () => {
          expect(result.version.files[0].content).toBe('new content');
        });

        it('sets the skillVersionId', () => {
          expect(result.version.files[0].skillVersionId).toBe(source.id);
        });
      });

      it('appends to existing files', () => {
        const existingFile = skillFileFactory({ path: 'existing.txt' });
        const source = skillVersionFactory({ files: [existingFile] });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.addSkillFile,
          payload: {
            item: {
              path: 'another.txt',
              content: 'another content',
              permissions: 'read',
              isBase64: false,
            },
          },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect(result.version.files).toHaveLength(2);
      });
    });

    describe('updateSkillFileContent', () => {
      it('applies diff to the targeted file content', () => {
        const fileId = createSkillFileId('file-to-update');
        const file = skillFileFactory({
          id: fileId,
          content: 'line1\nline2\nline3',
        });
        const source = skillVersionFactory({ files: [file] });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateSkillFileContent,
          payload: {
            targetId: fileId,
            oldValue: 'line1\nline2\nline3',
            newValue: 'line1\nupdated-content\nline3',
          },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect(result.version.files[0].content).toBe(
          'line1\nupdated-content\nline3',
        );
      });

      it('throws ChangeProposalConflictError on conflict', () => {
        const fileId = createSkillFileId('file-to-update');
        const file = skillFileFactory({
          id: fileId,
          content: 'line1\nchanged-by-someone\nline3',
        });
        const source = skillVersionFactory({ files: [file] });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateSkillFileContent,
          payload: {
            targetId: fileId,
            oldValue: 'line1\noriginal\nline3',
            newValue: 'line1\nchanged-by-proposal\nline3',
          },
        });

        expect(() =>
          applier.applyChangeProposals(source, [proposal as ChangeProposal]),
        ).toThrow(ChangeProposalConflictError);
      });

      describe('when isBase64 is provided in payload', () => {
        it('updates the isBase64 flag', () => {
          const fileId = createSkillFileId('file-to-update');
          const file = skillFileFactory({
            id: fileId,
            content: 'old-content',
            isBase64: false,
          });
          const source = skillVersionFactory({ files: [file] });
          const proposal = changeProposalFactory({
            type: ChangeProposalType.updateSkillFileContent,
            payload: {
              targetId: fileId,
              oldValue: 'old-content',
              newValue: 'new-content',
              isBase64: true,
            },
          });

          const result = applier.applyChangeProposals(source, [
            proposal as ChangeProposal,
          ]);

          expect(result.version.files[0].isBase64).toBe(true);
        });
      });

      it('does not modify other files', () => {
        const targetFileId = createSkillFileId('target-file');
        const otherFileId = createSkillFileId('other-file');
        const targetFile = skillFileFactory({
          id: targetFileId,
          content: 'target content',
        });
        const otherFile = skillFileFactory({
          id: otherFileId,
          content: 'other content',
        });
        const source = skillVersionFactory({
          files: [targetFile, otherFile],
        });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateSkillFileContent,
          payload: {
            targetId: targetFileId,
            oldValue: 'target content',
            newValue: 'updated target',
          },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect(result.version.files[1].content).toBe('other content');
      });
    });

    describe('updateSkillFilePermissions', () => {
      it('overrides the permissions of the targeted file', () => {
        const fileId = createSkillFileId('file-to-update');
        const file = skillFileFactory({ id: fileId, permissions: 'read' });
        const source = skillVersionFactory({ files: [file] });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateSkillFilePermissions,
          payload: {
            targetId: fileId,
            oldValue: 'read',
            newValue: 'read-write',
          },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect(result.version.files[0].permissions).toBe('read-write');
      });

      it('does not modify other files', () => {
        const targetFileId = createSkillFileId('target-file');
        const otherFileId = createSkillFileId('other-file');
        const targetFile = skillFileFactory({
          id: targetFileId,
          permissions: 'read',
        });
        const otherFile = skillFileFactory({
          id: otherFileId,
          permissions: 'execute',
        });
        const source = skillVersionFactory({
          files: [targetFile, otherFile],
        });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateSkillFilePermissions,
          payload: {
            targetId: targetFileId,
            oldValue: 'read',
            newValue: 'write',
          },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect(result.version.files[1].permissions).toBe('execute');
      });
    });

    describe('deleteSkillFile', () => {
      it('removes the targeted file', () => {
        const fileId = createSkillFileId('file-to-delete');
        const file = skillFileFactory({ id: fileId });
        const source = skillVersionFactory({ files: [file] });
        const proposal = changeProposalFactory({
          type: ChangeProposalType.deleteSkillFile,
          payload: {
            targetId: fileId,
            item: {
              id: fileId,
              path: file.path,
              content: file.content,
              permissions: file.permissions,
              isBase64: file.isBase64,
            },
          },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as ChangeProposal,
        ]);

        expect(result.version.files).toEqual([]);
      });

      describe('when deleting one of multiple files', () => {
        let result: ReturnType<typeof applier.applyChangeProposals>;
        let fileToKeep: ReturnType<typeof skillFileFactory>;

        beforeEach(() => {
          const fileToDelete = skillFileFactory({
            id: createSkillFileId('delete-me'),
          });
          fileToKeep = skillFileFactory({
            id: createSkillFileId('keep-me'),
          });
          const source = skillVersionFactory({
            files: [fileToDelete, fileToKeep],
          });
          const proposal = changeProposalFactory({
            type: ChangeProposalType.deleteSkillFile,
            payload: {
              targetId: fileToDelete.id,
              item: {
                id: fileToDelete.id,
                path: fileToDelete.path,
                content: fileToDelete.content,
                permissions: fileToDelete.permissions,
                isBase64: fileToDelete.isBase64,
              },
            },
          });

          result = applier.applyChangeProposals(source, [
            proposal as ChangeProposal,
          ]);
        });

        it('removes the deleted file', () => {
          expect(result.version.files).toHaveLength(1);
        });

        it('keeps the other file', () => {
          expect(result.version.files[0].id).toBe(fileToKeep.id);
        });
      });
    });

    describe('updateSkillAdditionalProperty', () => {
      let source: SkillVersionWithFiles;
      let result: { version: SkillVersionWithFiles };

      describe('when setting a new additional property', () => {
        beforeEach(() => {
          source = skillVersionFactory({ additionalProperties: undefined });
          const proposal = changeProposalFactory({
            type: ChangeProposalType.updateSkillAdditionalProperty,
            payload: {
              targetId: 'maxTokens',
              oldValue: '',
              newValue: JSON.stringify(4096),
            },
          });

          result = applier.applyChangeProposals(source, [
            proposal as ChangeProposal,
          ]);
        });

        it('sets the additional property on the result', () => {
          expect(result.version.additionalProperties).toEqual({
            maxTokens: 4096,
          });
        });
      });

      describe('when updating an existing additional property', () => {
        beforeEach(() => {
          source = skillVersionFactory({
            additionalProperties: { maxTokens: 4096 },
          });
          const proposal = changeProposalFactory({
            type: ChangeProposalType.updateSkillAdditionalProperty,
            payload: {
              targetId: 'maxTokens',
              oldValue: JSON.stringify(4096),
              newValue: JSON.stringify(8192),
            },
          });

          result = applier.applyChangeProposals(source, [
            proposal as ChangeProposal,
          ]);
        });

        it('updates the additional property value', () => {
          expect(result.version.additionalProperties).toEqual({
            maxTokens: 8192,
          });
        });
      });

      describe('when removing a property via empty string newValue', () => {
        beforeEach(() => {
          source = skillVersionFactory({
            additionalProperties: { maxTokens: 4096, temperature: 0.7 },
          });
          const proposal = changeProposalFactory({
            type: ChangeProposalType.updateSkillAdditionalProperty,
            payload: {
              targetId: 'maxTokens',
              oldValue: JSON.stringify(4096),
              newValue: '',
            },
          });

          result = applier.applyChangeProposals(source, [
            proposal as ChangeProposal,
          ]);
        });

        it('removes the specified property', () => {
          expect(result.version.additionalProperties).toEqual({
            temperature: 0.7,
          });
        });
      });

      describe('when newValue is malformed JSON', () => {
        it('throws ChangeProposalPayloadParseError', () => {
          const source = skillVersionFactory({
            additionalProperties: { maxTokens: 4096 },
          });
          const proposal = changeProposalFactory({
            type: ChangeProposalType.updateSkillAdditionalProperty,
            payload: {
              targetId: 'maxTokens',
              oldValue: JSON.stringify(4096),
              newValue: 'not-valid-json{',
            },
          });

          expect(() =>
            applier.applyChangeProposals(source, [
              proposal as ChangeProposal,
            ]),
          ).toThrow(ChangeProposalPayloadParseError);
        });
      });

      describe('when removing the last remaining property', () => {
        beforeEach(() => {
          source = skillVersionFactory({
            additionalProperties: { maxTokens: 4096 },
          });
          const proposal = changeProposalFactory({
            type: ChangeProposalType.updateSkillAdditionalProperty,
            payload: {
              targetId: 'maxTokens',
              oldValue: JSON.stringify(4096),
              newValue: '',
            },
          });

          result = applier.applyChangeProposals(source, [
            proposal as ChangeProposal,
          ]);
        });

        it('clears additionalProperties to undefined', () => {
          expect(result.version.additionalProperties).toBeUndefined();
        });
      });
    });

    describe('unsupported type', () => {
      it('returns source unchanged for unsupported change proposal types', () => {
        const source = skillVersionFactory();
        const proposal = changeProposalFactory({
          type: ChangeProposalType.updateStandardName,
          payload: { oldValue: 'Old', newValue: 'New' },
        });

        const result = applier.applyChangeProposals(source, [
          proposal as unknown as ChangeProposal,
        ]);

        expect(result.version).toEqual(source);
      });
    });
  });
});
