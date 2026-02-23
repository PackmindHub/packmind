import { skillVersionFactory } from '@packmind/skills/test';
import {
  ChangeProposalType,
  createChangeProposalId,
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
  });
});
