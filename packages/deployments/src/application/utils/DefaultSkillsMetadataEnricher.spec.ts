import { DefaultSkillsDeployer } from '@packmind/coding-agent';
import { DeleteItemType, FileUpdates } from '@packmind/types';
import { enrichDefaultSkillsFileModifications } from './DefaultSkillsMetadataEnricher';

describe('DefaultSkillsMetadataEnricher', () => {
  describe('enrichDefaultSkillsFileModifications', () => {
    describe('with the real DefaultSkillsDeployer output', () => {
      let result: FileUpdates;
      let deployer: DefaultSkillsDeployer;

      beforeEach(() => {
        deployer = new DefaultSkillsDeployer('TestAgent', '.test/skills/');
        const deployerResult = deployer.deployDefaultSkills({
          includeBeta: true,
        });
        result = enrichDefaultSkillsFileModifications(
          deployerResult.fileUpdates,
          deployerResult.deployedSkills,
        );
      });

      it('stamps source: default on every emitted file', () => {
        for (const file of result.createOrUpdate) {
          expect(file.source).toBe('default');
        }
      });

      it('stamps artifactType: skill on every emitted file', () => {
        for (const file of result.createOrUpdate) {
          expect(file.artifactType).toBe('skill');
        }
      });

      it('stamps artifactId equal to the skill slug for every file', () => {
        for (const file of result.createOrUpdate) {
          expect(file.artifactId).toBeDefined();
          expect(file.path).toContain(`/${file.artifactId}/`);
        }
      });

      it('stamps artifactSlug equal to the skill slug for every file', () => {
        for (const file of result.createOrUpdate) {
          expect(file.artifactSlug).toBe(file.artifactId);
        }
      });

      it('stamps a non-empty artifactName on every file', () => {
        for (const file of result.createOrUpdate) {
          expect(typeof file.artifactName).toBe('string');
          expect(file.artifactName?.length ?? 0).toBeGreaterThan(0);
        }
      });

      it('stamps a numeric artifactVersion on every file', () => {
        for (const file of result.createOrUpdate) {
          expect(typeof file.artifactVersion).toBe('number');
        }
      });

      it('stamps empty spaceId on every file', () => {
        for (const file of result.createOrUpdate) {
          expect(file.spaceId).toBe('');
        }
      });

      it('stamps empty packageIds on every file', () => {
        for (const file of result.createOrUpdate) {
          expect(file.packageIds).toEqual([]);
        }
      });

      it('covers packmind-create-skill', () => {
        expect(
          result.createOrUpdate.some(
            (f) => f.artifactSlug === 'packmind-create-skill',
          ),
        ).toBe(true);
      });

      it('covers packmind-create-standard', () => {
        expect(
          result.createOrUpdate.some(
            (f) => f.artifactSlug === 'packmind-create-standard',
          ),
        ).toBe(true);
      });

      it('covers packmind-onboard', () => {
        expect(
          result.createOrUpdate.some(
            (f) => f.artifactSlug === 'packmind-onboard',
          ),
        ).toBe(true);
      });

      it('covers packmind-create-command', () => {
        expect(
          result.createOrUpdate.some(
            (f) => f.artifactSlug === 'packmind-create-command',
          ),
        ).toBe(true);
      });

      it('covers packmind-create-package', () => {
        expect(
          result.createOrUpdate.some(
            (f) => f.artifactSlug === 'packmind-create-package',
          ),
        ).toBe(true);
      });

      it('covers packmind-cli-list-commands', () => {
        expect(
          result.createOrUpdate.some(
            (f) => f.artifactSlug === 'packmind-cli-list-commands',
          ),
        ).toBe(true);
      });

      it('covers packmind-update-playbook', () => {
        expect(
          result.createOrUpdate.some(
            (f) => f.artifactSlug === 'packmind-update-playbook',
          ),
        ).toBe(true);
      });
    });

    describe('with a file not covered by deployedSkills', () => {
      it('leaves the unrelated FileModification untouched', () => {
        const input: FileUpdates = {
          createOrUpdate: [
            {
              path: '.test/skills/some-other-thing/SKILL.md',
              content: 'unknown',
            },
          ],
          delete: [],
        };

        const output = enrichDefaultSkillsFileModifications(input, [
          {
            slug: 'packmind-create-skill',
            name: 'Create skill',
            version: 1,
          },
        ]);

        expect(output.createOrUpdate[0]).toEqual({
          path: '.test/skills/some-other-thing/SKILL.md',
          content: 'unknown',
        });
      });
    });

    describe('with an empty deployedSkills list', () => {
      it('returns every file untouched', () => {
        const input: FileUpdates = {
          createOrUpdate: [
            {
              path: '.test/skills/packmind-create-skill/SKILL.md',
              content: 'some content',
            },
          ],
          delete: [],
        };

        const output = enrichDefaultSkillsFileModifications(input, []);

        expect(output.createOrUpdate[0]).toEqual({
          path: '.test/skills/packmind-create-skill/SKILL.md',
          content: 'some content',
        });
      });
    });

    describe('with delete entries', () => {
      it('preserves the delete list unchanged', () => {
        const input: FileUpdates = {
          createOrUpdate: [],
          delete: [
            {
              path: '.test/skills/packmind-onboard/steps',
              type: DeleteItemType.Directory,
            },
          ],
        };

        const output = enrichDefaultSkillsFileModifications(input, [
          {
            slug: 'packmind-onboard',
            name: 'Onboard',
            version: 1,
          },
        ]);

        expect(output.delete).toEqual(input.delete);
      });
    });

    describe('with a single hand-crafted file', () => {
      it('stamps all the expected metadata fields', () => {
        const input: FileUpdates = {
          createOrUpdate: [
            {
              path: '.test/skills/packmind-create-skill/SKILL.md',
              content: 'body',
            },
          ],
          delete: [],
        };

        const [enriched] = enrichDefaultSkillsFileModifications(input, [
          {
            slug: 'packmind-create-skill',
            name: 'Create skill',
            version: 1,
          },
        ]).createOrUpdate;

        expect(enriched).toEqual({
          path: '.test/skills/packmind-create-skill/SKILL.md',
          content: 'body',
          artifactType: 'skill',
          artifactId: 'packmind-create-skill',
          artifactSlug: 'packmind-create-skill',
          artifactName: 'Create skill',
          artifactVersion: 1,
          spaceId: '',
          packageIds: [],
          source: 'default',
        });
      });
    });

    describe('immutability', () => {
      it('does not mutate the input FileModifications', () => {
        const inputFile = {
          path: '.test/skills/packmind-create-skill/SKILL.md',
          content: 'body',
        };
        const input: FileUpdates = {
          createOrUpdate: [inputFile],
          delete: [],
        };

        enrichDefaultSkillsFileModifications(input, [
          {
            slug: 'packmind-create-skill',
            name: 'Create skill',
            version: 1,
          },
        ]);

        // Original FileModification unchanged
        expect(inputFile).toEqual({
          path: '.test/skills/packmind-create-skill/SKILL.md',
          content: 'body',
        });
      });
    });
  });
});
