import { skillVersionFactory, skillFileFactory } from '@packmind/skills/test';
import {
  ChangeProposalType,
  createChangeProposalId,
  createSkillFileId,
  ISkillsPort,
} from '@packmind/types';
import { changeProposalFactory } from '../../../../test';
import { DiffService } from '../../services/DiffService';
import { ChangeProposalConflictError } from '../../../domain/errors';
import { SkillChangeProposalsApplier } from './SkillChangeProposalsApplier';

describe('SkillChangeProposalsApplier', () => {
  let applier: SkillChangeProposalsApplier;
  let skillsPort: jest.Mocked<ISkillsPort>;
  let diffService: DiffService;

  beforeEach(() => {
    diffService = new DiffService();
    skillsPort = {} as unknown as jest.Mocked<ISkillsPort>;

    applier = new SkillChangeProposalsApplier(diffService, skillsPort);
  });

  const skillVersion = skillVersionFactory({
    name: 'some-skill',
    description: 'A description of the skill',
    prompt: 'Do things and stuff',
  });

  describe('applyChangeProposal', () => {
    describe('when updating the skill name', () => {
      const changeProposals = [
        changeProposalFactory({
          type: ChangeProposalType.updateSkillName,
          payload: {
            oldValue: skillVersion.name,
            newValue: `before--${skillVersion.name}`,
          },
        }),
        changeProposalFactory({
          type: ChangeProposalType.updateSkillName,
          payload: {
            oldValue: skillVersion.name,
            newValue: `${skillVersion.name}--after`,
          },
        }),
      ];

      it('overrides the skill name with each proposal', () => {
        const newSkillVersion = applier.applyChangeProposals(
          skillVersion,
          changeProposals,
        );

        expect(newSkillVersion).toEqual({
          ...skillVersion,
          name: `${skillVersion.name}--after`,
        });
      });
    });

    describe('when updating the skill description', () => {
      const changeProposals = [
        changeProposalFactory({
          type: ChangeProposalType.updateSkillDescription,
          payload: {
            oldValue: skillVersion.description,
            newValue: `A line before:\n${skillVersion.description}`,
          },
        }),
        changeProposalFactory({
          type: ChangeProposalType.updateSkillDescription,
          payload: {
            oldValue: skillVersion.description,
            newValue: `${skillVersion.description}\nA line after`,
          },
        }),
      ];

      it('uses the diff service to apply the changes', () => {
        const newVersion = applier.applyChangeProposals(
          skillVersion,
          changeProposals,
        );

        expect(newVersion).toEqual({
          ...skillVersion,
          description: `A line before:\n${skillVersion.description}\nA line after`,
        });
      });

      it('throws a ChangeProposalConflictError if applying the diff fails', () => {
        expect(() =>
          applier.applyChangeProposals(skillVersion, [
            changeProposalFactory({
              id: createChangeProposalId('proposal-1'),
              type: ChangeProposalType.updateSkillDescription,
              payload: {
                oldValue: skillVersion.description,
                newValue: `---${skillVersion.description}`,
              },
            }),
            changeProposalFactory({
              id: createChangeProposalId('proposal-2'),
              type: ChangeProposalType.updateSkillDescription,
              payload: {
                oldValue: skillVersion.description,
                newValue: `${skillVersion.description}---`,
              },
            }),
          ]),
        ).toThrow(
          new ChangeProposalConflictError(createChangeProposalId('proposal-2')),
        );
      });
    });

    describe('when updating the skill prompt', () => {
      const changeProposals = [
        changeProposalFactory({
          type: ChangeProposalType.updateSkillPrompt,
          payload: {
            oldValue: skillVersion.prompt,
            newValue: `Before:\n${skillVersion.prompt}`,
          },
        }),
        changeProposalFactory({
          type: ChangeProposalType.updateSkillPrompt,
          payload: {
            oldValue: skillVersion.prompt,
            newValue: `${skillVersion.prompt}\nAfter`,
          },
        }),
      ];

      it('uses the diff service to apply the changes', () => {
        const newVersion = applier.applyChangeProposals(
          skillVersion,
          changeProposals,
        );

        expect(newVersion).toEqual({
          ...skillVersion,
          prompt: `Before:\n${skillVersion.prompt}\nAfter`,
        });
      });

      it('throws a ChangeProposalConflictError if applying the diff fails', () => {
        expect(() =>
          applier.applyChangeProposals(skillVersion, [
            changeProposalFactory({
              id: createChangeProposalId('proposal-1'),
              type: ChangeProposalType.updateSkillPrompt,
              payload: {
                oldValue: skillVersion.prompt,
                newValue: `---${skillVersion.prompt}`,
              },
            }),
            changeProposalFactory({
              id: createChangeProposalId('proposal-2'),
              type: ChangeProposalType.updateSkillPrompt,
              payload: {
                oldValue: skillVersion.prompt,
                newValue: `${skillVersion.prompt}---`,
              },
            }),
          ]),
        ).toThrow(
          new ChangeProposalConflictError(createChangeProposalId('proposal-2')),
        );
      });
    });

    describe('when updating the skill metadata', () => {
      const changeProposals = [
        changeProposalFactory({
          type: ChangeProposalType.updateSkillMetadata,
          payload: {
            oldValue: JSON.stringify({ key1: 'value1' }),
            newValue: JSON.stringify({ key1: 'updated', key2: 'value2' }),
          },
        }),
        changeProposalFactory({
          type: ChangeProposalType.updateSkillMetadata,
          payload: {
            oldValue: JSON.stringify({ key1: 'updated', key2: 'value2' }),
            newValue: JSON.stringify({ key3: 'value3' }),
          },
        }),
      ];

      it('overrides the skill metadata with each proposal', () => {
        const newSkillVersion = applier.applyChangeProposals(
          skillVersion,
          changeProposals,
        );

        expect(newSkillVersion).toEqual({
          ...skillVersion,
          metadata: { key3: 'value3' },
        });
      });
    });

    describe('when updating the skill license', () => {
      const changeProposals = [
        changeProposalFactory({
          type: ChangeProposalType.updateSkillLicense,
          payload: {
            oldValue: 'MIT',
            newValue: 'Apache-2.0',
          },
        }),
        changeProposalFactory({
          type: ChangeProposalType.updateSkillLicense,
          payload: {
            oldValue: 'Apache-2.0',
            newValue: 'GPL-3.0',
          },
        }),
      ];

      it('overrides the skill license with each proposal', () => {
        const newSkillVersion = applier.applyChangeProposals(
          skillVersion,
          changeProposals,
        );

        expect(newSkillVersion).toEqual({
          ...skillVersion,
          license: 'GPL-3.0',
        });
      });
    });

    describe('when updating the skill compatibility', () => {
      const changeProposals = [
        changeProposalFactory({
          type: ChangeProposalType.updateSkillCompatibility,
          payload: {
            oldValue: '^1.0.0',
            newValue: '^2.0.0',
          },
        }),
        changeProposalFactory({
          type: ChangeProposalType.updateSkillCompatibility,
          payload: {
            oldValue: '^2.0.0',
            newValue: '^3.0.0',
          },
        }),
      ];

      it('overrides the skill compatibility with each proposal', () => {
        const newSkillVersion = applier.applyChangeProposals(
          skillVersion,
          changeProposals,
        );

        expect(newSkillVersion).toEqual({
          ...skillVersion,
          compatibility: '^3.0.0',
        });
      });
    });

    describe('when updating the skill allowed tools', () => {
      const changeProposals = [
        changeProposalFactory({
          type: ChangeProposalType.updateSkillAllowedTools,
          payload: {
            oldValue: 'tool1,tool2',
            newValue: 'tool2,tool3',
          },
        }),
        changeProposalFactory({
          type: ChangeProposalType.updateSkillAllowedTools,
          payload: {
            oldValue: 'tool2,tool3',
            newValue: 'tool3,tool4,tool5',
          },
        }),
      ];

      it('overrides the skill allowed tools with each proposal', () => {
        const newSkillVersion = applier.applyChangeProposals(
          skillVersion,
          changeProposals,
        );

        expect(newSkillVersion).toEqual({
          ...skillVersion,
          allowedTools: 'tool3,tool4,tool5',
        });
      });
    });

    describe('when adding skill files', () => {
      describe('when skill version has no files', () => {
        const skillVersionWithoutFiles = skillVersionFactory({
          files: undefined,
        });

        it('creates a new files array with one file with correct properties', () => {
          const changeProposal = changeProposalFactory({
            type: ChangeProposalType.addSkillFile,
            payload: {
              item: {
                path: 'new-file.md',
                content: 'New file content',
                permissions: 'rw-r--r--',
                isBase64: false,
              },
            },
          });

          const newSkillVersion = applier.applyChangeProposals(
            skillVersionWithoutFiles,
            [changeProposal],
          );

          expect(newSkillVersion.files).toEqual([
            expect.objectContaining({
              id: expect.any(String),
              path: 'new-file.md',
              content: 'New file content',
              permissions: 'rw-r--r--',
              isBase64: false,
              skillVersionId: skillVersionWithoutFiles.id,
            }),
          ]);
        });
      });

      describe('when skill version has existing files', () => {
        const existingFile = skillFileFactory({
          path: 'existing.md',
          content: 'Existing content',
        });
        const skillVersionWithFiles = skillVersionFactory({
          files: [existingFile],
        });

        it('adds the new file while preserving existing files', () => {
          const changeProposal = changeProposalFactory({
            type: ChangeProposalType.addSkillFile,
            payload: {
              item: {
                path: 'new-file.md',
                content: 'New file content',
                permissions: 'rw-r--r--',
                isBase64: false,
              },
            },
          });

          const newSkillVersion = applier.applyChangeProposals(
            skillVersionWithFiles,
            [changeProposal],
          );

          expect(newSkillVersion.files).toEqual([
            existingFile,
            expect.objectContaining({
              id: expect.any(String),
              path: 'new-file.md',
              content: 'New file content',
              permissions: 'rw-r--r--',
              isBase64: false,
              skillVersionId: skillVersionWithFiles.id,
            }),
          ]);
        });
      });

      describe('when adding multiple files', () => {
        it('adds all files in sequence', () => {
          const changeProposals = [
            changeProposalFactory({
              type: ChangeProposalType.addSkillFile,
              payload: {
                item: {
                  path: 'file1.md',
                  content: 'Content 1',
                  permissions: 'rw-r--r--',
                  isBase64: false,
                },
              },
            }),
            changeProposalFactory({
              type: ChangeProposalType.addSkillFile,
              payload: {
                item: {
                  path: 'file2.md',
                  content: 'Content 2',
                  permissions: 'rw-r--r--',
                  isBase64: false,
                },
              },
            }),
          ];

          const newSkillVersion = applier.applyChangeProposals(
            skillVersion,
            changeProposals,
          );

          expect(newSkillVersion.files).toEqual([
            expect.objectContaining({ path: 'file1.md' }),
            expect.objectContaining({ path: 'file2.md' }),
          ]);
        });
      });
    });

    describe('when updating skill file content', () => {
      const fileId = createSkillFileId('test-file-id');
      const existingFile = skillFileFactory({
        id: fileId,
        path: 'test.md',
        content: 'Original content',
        isBase64: false,
      });
      const skillVersionWithFile = skillVersionFactory({
        files: [existingFile],
      });

      it('applies diff to the file content', () => {
        const changeProposal = changeProposalFactory({
          type: ChangeProposalType.updateSkillFileContent,
          payload: {
            targetId: fileId,
            oldValue: 'Original content',
            newValue: 'Original content\nAdded line',
          },
        });

        const newSkillVersion = applier.applyChangeProposals(
          skillVersionWithFile,
          [changeProposal],
        );

        expect(newSkillVersion.files?.[0]).toMatchObject({
          id: fileId,
          content: 'Original content\nAdded line',
          isBase64: false,
        });
      });

      describe('when isBase64 is provided', () => {
        it('updates the isBase64 flag', () => {
          const changeProposal = changeProposalFactory({
            type: ChangeProposalType.updateSkillFileContent,
            payload: {
              targetId: fileId,
              oldValue: 'Original content',
              newValue: 'Base64EncodedContent',
              isBase64: true,
            },
          });

          const newSkillVersion = applier.applyChangeProposals(
            skillVersionWithFile,
            [changeProposal],
          );

          expect(newSkillVersion.files?.[0]).toMatchObject({
            id: fileId,
            content: 'Base64EncodedContent',
            isBase64: true,
          });
        });
      });

      describe('when multiple files exist', () => {
        const otherFile = skillFileFactory({
          id: createSkillFileId('other-file-id'),
          path: 'other.md',
          content: 'Other content',
        });
        const versionWithMultipleFiles = skillVersionFactory({
          files: [existingFile, otherFile],
        });

        it('updates only the targeted file content', () => {
          const changeProposal = changeProposalFactory({
            type: ChangeProposalType.updateSkillFileContent,
            payload: {
              targetId: fileId,
              oldValue: 'Original content',
              newValue: 'Updated content',
            },
          });

          const newSkillVersion = applier.applyChangeProposals(
            versionWithMultipleFiles,
            [changeProposal],
          );

          expect(newSkillVersion.files).toEqual([
            expect.objectContaining({
              id: fileId,
              content: 'Updated content',
            }),
            otherFile,
          ]);
        });
      });

      it('throws a ChangeProposalConflictError if applying the diff fails', () => {
        expect(() =>
          applier.applyChangeProposals(skillVersionWithFile, [
            changeProposalFactory({
              id: createChangeProposalId('proposal-1'),
              type: ChangeProposalType.updateSkillFileContent,
              payload: {
                targetId: fileId,
                oldValue: 'Original content',
                newValue: '---Original content',
              },
            }),
            changeProposalFactory({
              id: createChangeProposalId('proposal-2'),
              type: ChangeProposalType.updateSkillFileContent,
              payload: {
                targetId: fileId,
                oldValue: 'Original content',
                newValue: 'Original content---',
              },
            }),
          ]),
        ).toThrow(
          new ChangeProposalConflictError(createChangeProposalId('proposal-2')),
        );
      });
    });

    describe('when updating skill file permissions', () => {
      const fileId = createSkillFileId('test-file-id');
      const existingFile = skillFileFactory({
        id: fileId,
        path: 'test.md',
        permissions: 'rw-r--r--',
      });
      const skillVersionWithFile = skillVersionFactory({
        files: [existingFile],
      });

      it('updates the file permissions', () => {
        const changeProposal = changeProposalFactory({
          type: ChangeProposalType.updateSkillFilePermissions,
          payload: {
            targetId: fileId,
            oldValue: 'rw-r--r--',
            newValue: 'rwxr-xr-x',
          },
        });

        const newSkillVersion = applier.applyChangeProposals(
          skillVersionWithFile,
          [changeProposal],
        );

        expect(newSkillVersion.files?.[0].permissions).toBe('rwxr-xr-x');
      });

      describe('when multiple files exist', () => {
        const otherFile = skillFileFactory({
          id: createSkillFileId('other-file-id'),
          path: 'other.md',
          permissions: 'rw-------',
        });
        const versionWithMultipleFiles = skillVersionFactory({
          files: [existingFile, otherFile],
        });

        it('updates only the targeted file permissions', () => {
          const changeProposal = changeProposalFactory({
            type: ChangeProposalType.updateSkillFilePermissions,
            payload: {
              targetId: fileId,
              oldValue: 'rw-r--r--',
              newValue: 'rwxr-xr-x',
            },
          });

          const newSkillVersion = applier.applyChangeProposals(
            versionWithMultipleFiles,
            [changeProposal],
          );

          expect(newSkillVersion.files).toEqual([
            expect.objectContaining({
              id: fileId,
              permissions: 'rwxr-xr-x',
            }),
            otherFile,
          ]);
        });
      });
    });

    describe('when deleting skill files', () => {
      const fileId = createSkillFileId('test-file-id');
      const existingFile = skillFileFactory({
        id: fileId,
        path: 'test.md',
      });

      describe('when skill version has a single file', () => {
        const skillVersionWithFile = skillVersionFactory({
          files: [existingFile],
        });

        it('removes the file from the files array', () => {
          const changeProposal = changeProposalFactory({
            type: ChangeProposalType.deleteSkillFile,
            payload: {
              targetId: fileId,
              item: existingFile,
            },
          });

          const newSkillVersion = applier.applyChangeProposals(
            skillVersionWithFile,
            [changeProposal],
          );

          expect(newSkillVersion.files).toEqual([]);
        });
      });

      describe('when skill version has multiple files', () => {
        const otherFile = skillFileFactory({
          id: createSkillFileId('other-file-id'),
          path: 'other.md',
        });
        const skillVersionWithFiles = skillVersionFactory({
          files: [existingFile, otherFile],
        });

        it('removes only the targeted file', () => {
          const changeProposal = changeProposalFactory({
            type: ChangeProposalType.deleteSkillFile,
            payload: {
              targetId: fileId,
              item: existingFile,
            },
          });

          const newSkillVersion = applier.applyChangeProposals(
            skillVersionWithFiles,
            [changeProposal],
          );

          expect(newSkillVersion.files).toEqual([otherFile]);
        });
      });

      describe('when deleting multiple files', () => {
        const file1Id = createSkillFileId('file-1-id');
        const file2Id = createSkillFileId('file-2-id');
        const file1 = skillFileFactory({ id: file1Id, path: 'file1.md' });
        const file2 = skillFileFactory({ id: file2Id, path: 'file2.md' });
        const file3 = skillFileFactory({
          id: createSkillFileId('file-3-id'),
          path: 'file3.md',
        });
        const skillVersionWithFiles = skillVersionFactory({
          files: [file1, file2, file3],
        });

        it('removes all targeted files', () => {
          const changeProposals = [
            changeProposalFactory({
              type: ChangeProposalType.deleteSkillFile,
              payload: {
                targetId: file1Id,
                item: file1,
              },
            }),
            changeProposalFactory({
              type: ChangeProposalType.deleteSkillFile,
              payload: {
                targetId: file2Id,
                item: file2,
              },
            }),
          ];

          const newSkillVersion = applier.applyChangeProposals(
            skillVersionWithFiles,
            changeProposals,
          );

          expect(newSkillVersion.files).toEqual([file3]);
        });
      });

      describe('when skill version has no files', () => {
        const skillVersionWithoutFiles = skillVersionFactory({
          files: undefined,
        });

        it('returns an empty array', () => {
          const changeProposal = changeProposalFactory({
            type: ChangeProposalType.deleteSkillFile,
            payload: {
              targetId: fileId,
              item: existingFile,
            },
          });

          const newSkillVersion = applier.applyChangeProposals(
            skillVersionWithoutFiles,
            [changeProposal],
          );

          expect(newSkillVersion.files).toEqual([]);
        });
      });
    });
  });
});
