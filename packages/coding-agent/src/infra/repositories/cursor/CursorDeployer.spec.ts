import { CursorDeployer } from './CursorDeployer';
import {
  GitRepo,
  createGitRepoId,
  createGitProviderId,
  Target,
  createTargetId,
  IStandardsPort,
  SkillVersion,
  createSkillVersionId,
  createSkillFileId,
  DeleteItemType,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { skillVersionFactory } from '@packmind/skills/test';

describe('CursorDeployer', () => {
  let deployer: CursorDeployer;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockGitRepo: GitRepo;
  let mockTarget: Target;

  beforeEach(() => {
    mockStandardsPort = {
      getRulesByStandardId: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    deployer = new CursorDeployer(mockStandardsPort);

    mockTarget = {
      id: createTargetId('test-target-id'),
      name: 'Test Target',
      path: '/',
      gitRepoId: createGitRepoId(uuidv4()),
    };

    mockGitRepo = {
      id: createGitRepoId('test-repo-id'),
      owner: 'test-owner',
      repo: 'test-repo',
      providerId: createGitProviderId('provider-id'),
      branch: 'main',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSkillsFolderPath', () => {
    it('returns the Cursor skills folder path', () => {
      expect(deployer.getSkillsFolderPath()).toBe('.cursor/skills/');
    });
  });

  describe('deployDefaultSkills', () => {
    it('returns file updates for default skills', async () => {
      const result = await deployer.deployDefaultSkills();

      expect(result.createOrUpdate.length).toBeGreaterThan(0);
    });
  });

  describe('deploySkills', () => {
    let skillVersions: SkillVersion[];

    beforeEach(() => {
      skillVersions = [
        skillVersionFactory({
          name: 'Test Skill',
          slug: 'test-skill',
          description: 'A test skill for Cursor deployment',
          prompt: 'This is the skill prompt content for testing',
          license: 'MIT',
          compatibility: 'Cursor',
          metadata: { category: 'testing', version: '1.0' },
          allowedTools: 'Read,Write,Bash',
        }),
      ];
    });

    describe('when calling deploySkills', () => {
      let fileUpdates: Awaited<ReturnType<typeof deployer.deploySkills>>;

      beforeEach(async () => {
        fileUpdates = await deployer.deploySkills(
          skillVersions,
          mockGitRepo,
          mockTarget,
        );
      });

      it('creates one SKILL.md file in a folder', () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(1);
      });

      it('creates SKILL.md at correct path', () => {
        expect(fileUpdates.createOrUpdate[0].path).toBe(
          `.cursor/skills/${skillVersions[0].slug}/SKILL.md`,
        );
      });

      it('includes name in frontmatter', () => {
        expect(fileUpdates.createOrUpdate[0].content).toContain(
          `name: '${skillVersions[0].name}'`,
        );
      });

      it('includes description in frontmatter', () => {
        expect(fileUpdates.createOrUpdate[0].content).toContain(
          `description: '${skillVersions[0].description}'`,
        );
      });

      it('includes license in frontmatter', () => {
        expect(fileUpdates.createOrUpdate[0].content).toContain(
          `license: '${skillVersions[0].license}'`,
        );
      });

      it('includes compatibility in frontmatter', () => {
        expect(fileUpdates.createOrUpdate[0].content).toContain(
          `compatibility: '${skillVersions[0].compatibility}'`,
        );
      });

      it('includes allowed-tools in frontmatter', () => {
        expect(fileUpdates.createOrUpdate[0].content).toContain(
          `allowed-tools: '${skillVersions[0].allowedTools}'`,
        );
      });

      it('includes metadata section in frontmatter', () => {
        const content = fileUpdates.createOrUpdate[0].content;
        expect(content).toContain('metadata:');
      });

      it('includes category in metadata', () => {
        const content = fileUpdates.createOrUpdate[0].content;
        expect(content).toContain("category: 'testing'");
      });

      it('includes version in metadata', () => {
        const content = fileUpdates.createOrUpdate[0].content;
        expect(content).toContain("version: '1.0'");
      });

      it('includes prompt content in body', () => {
        expect(fileUpdates.createOrUpdate[0].content).toContain(
          'This is the skill prompt content for testing',
        );
      });

      it('starts with YAML frontmatter delimiter', () => {
        const content = fileUpdates.createOrUpdate[0].content;
        expect(content).toMatch(/^---\n/);
      });

      it('ends frontmatter section with YAML delimiter', () => {
        const content = fileUpdates.createOrUpdate[0].content;
        expect(content).toMatch(/\n---\n/);
      });
    });

    describe('when deploying with target path prefixing', () => {
      it('applies target path prefix to file path', async () => {
        const targetWithPath: Target = {
          ...mockTarget,
          path: '/apps/web',
        };

        const fileUpdates = await deployer.deploySkills(
          skillVersions,
          mockGitRepo,
          targetWithPath,
        );

        expect(fileUpdates.createOrUpdate[0].path).toBe(
          `apps/web/.cursor/skills/${skillVersions[0].slug}/SKILL.md`,
        );
      });
    });

    describe('when skill has single quotes in description', () => {
      let skillWithSingleQuotes: SkillVersion;

      beforeEach(() => {
        skillWithSingleQuotes = skillVersionFactory({
          name: 'Skill with quotes',
          slug: 'skill-with-quotes',
          description: "This skill's description has 'single quotes'",
          prompt: 'Test prompt',
        });
      });

      it('escapes single quotes in YAML frontmatter', async () => {
        const fileUpdates = await deployer.deploySkills(
          [skillWithSingleQuotes],
          mockGitRepo,
          mockTarget,
        );

        expect(fileUpdates.createOrUpdate[0].content).toContain(
          "description: 'This skill''s description has ''single quotes'''",
        );
      });
    });

    describe('when skill has double quotes in description', () => {
      let skillWithDoubleQuotes: SkillVersion;

      beforeEach(() => {
        skillWithDoubleQuotes = skillVersionFactory({
          name: 'Skill with double quotes',
          slug: 'skill-with-double-quotes',
          description: 'This skill has "double quotes" in description',
          prompt: 'Test prompt',
        });
      });

      it('preserves double quotes in YAML frontmatter', async () => {
        const fileUpdates = await deployer.deploySkills(
          [skillWithDoubleQuotes],
          mockGitRepo,
          mockTarget,
        );

        expect(fileUpdates.createOrUpdate[0].content).toContain(
          'description: \'This skill has "double quotes" in description\'',
        );
      });
    });

    describe('when skill has multiple files', () => {
      let skillVersionWithFiles: SkillVersion;

      beforeEach(() => {
        skillVersionWithFiles = skillVersionFactory({
          name: 'Multi-file Skill',
          slug: 'multi-file-skill',
          description: 'A skill with multiple files',
          prompt: 'See reference.md and forms.md for more information.',
          files: [
            {
              id: createSkillFileId('file-1'),
              skillVersionId: createSkillVersionId('skill-version-1'),
              path: 'reference.md',
              content:
                '# Reference\n\nThis is additional reference documentation.',
              permissions: 'rw-r--r--',
            },
            {
              id: createSkillFileId('file-2'),
              skillVersionId: createSkillVersionId('skill-version-1'),
              path: 'forms.md',
              content: '# Forms\n\nInstructions for working with forms.',
              permissions: 'rw-r--r--',
            },
          ],
        });
      });

      it('creates SKILL.md and all additional files', async () => {
        const fileUpdates = await deployer.deploySkills(
          [skillVersionWithFiles],
          mockGitRepo,
          mockTarget,
        );

        expect(fileUpdates.createOrUpdate).toHaveLength(3);
      });

      it('includes SKILL.md file', async () => {
        const fileUpdates = await deployer.deploySkills(
          [skillVersionWithFiles],
          mockGitRepo,
          mockTarget,
        );

        const paths = fileUpdates.createOrUpdate.map((f) => f.path);
        expect(paths).toContain(
          `.cursor/skills/${skillVersionWithFiles.slug}/SKILL.md`,
        );
      });

      it('includes reference.md file', async () => {
        const fileUpdates = await deployer.deploySkills(
          [skillVersionWithFiles],
          mockGitRepo,
          mockTarget,
        );

        const paths = fileUpdates.createOrUpdate.map((f) => f.path);
        expect(paths).toContain(
          `.cursor/skills/${skillVersionWithFiles.slug}/reference.md`,
        );
      });

      it('includes forms.md file', async () => {
        const fileUpdates = await deployer.deploySkills(
          [skillVersionWithFiles],
          mockGitRepo,
          mockTarget,
        );

        const paths = fileUpdates.createOrUpdate.map((f) => f.path);
        expect(paths).toContain(
          `.cursor/skills/${skillVersionWithFiles.slug}/forms.md`,
        );
      });

      it('includes correct content for reference.md', async () => {
        const fileUpdates = await deployer.deploySkills(
          [skillVersionWithFiles],
          mockGitRepo,
          mockTarget,
        );

        const referenceFile = fileUpdates.createOrUpdate.find((f) =>
          f.path.endsWith('reference.md'),
        );
        expect(referenceFile?.content).toContain(
          'This is additional reference documentation',
        );
      });

      it('places all files in the skill directory', async () => {
        const fileUpdates = await deployer.deploySkills(
          [skillVersionWithFiles],
          mockGitRepo,
          mockTarget,
        );

        for (const file of fileUpdates.createOrUpdate) {
          expect(file.path).toMatch(
            new RegExp(`^\\.cursor/skills/${skillVersionWithFiles.slug}/`),
          );
        }
      });
    });

    describe('when skill has no additional files', () => {
      it('creates only SKILL.md file', async () => {
        const skillVersionWithoutFiles = skillVersionFactory({
          files: undefined,
        });

        const fileUpdates = await deployer.deploySkills(
          [skillVersionWithoutFiles],
          mockGitRepo,
          mockTarget,
        );

        expect(fileUpdates.createOrUpdate).toHaveLength(1);
      });

      it('creates SKILL.md at correct path', async () => {
        const skillVersionWithoutFiles = skillVersionFactory({
          files: undefined,
        });

        const fileUpdates = await deployer.deploySkills(
          [skillVersionWithoutFiles],
          mockGitRepo,
          mockTarget,
        );

        expect(fileUpdates.createOrUpdate[0].path).toBe(
          `.cursor/skills/${skillVersionWithoutFiles.slug}/SKILL.md`,
        );
      });
    });

    describe('when skill file has isBase64 flag set to true', () => {
      it('preserves isBase64 flag in file update', async () => {
        const skillVersionsWithBase64File = [
          skillVersionFactory({
            files: [
              {
                id: createSkillFileId('file-1'),
                skillVersionId: createSkillVersionId('skill-version-1'),
                path: 'image.png',
                content: 'base64encodedcontent',
                permissions: 'rw-r--r--',
                isBase64: true,
              },
            ],
          }),
        ];

        const fileUpdates = await deployer.deploySkills(
          skillVersionsWithBase64File,
          mockGitRepo,
          mockTarget,
        );

        const imageFile = fileUpdates.createOrUpdate.find((f) =>
          f.path.endsWith('image.png'),
        );
        expect(imageFile?.isBase64).toBe(true);
      });
    });
  });

  describe('generateFileUpdatesForSkills', () => {
    let skillVersions: SkillVersion[];

    beforeEach(() => {
      skillVersions = [
        skillVersionFactory({
          name: 'Test Skill',
          slug: 'test-skill',
          description: 'A test skill for Cursor deployment',
          prompt: 'This is the skill prompt content for testing',
          license: 'MIT',
          compatibility: 'Cursor',
          metadata: { category: 'testing', version: '1.0' },
          allowedTools: 'Read,Write,Bash',
        }),
      ];
    });

    describe('when calling generateFileUpdatesForSkills', () => {
      let fileUpdates: Awaited<
        ReturnType<typeof deployer.generateFileUpdatesForSkills>
      >;

      beforeEach(async () => {
        fileUpdates =
          await deployer.generateFileUpdatesForSkills(skillVersions);
      });

      it('creates one SKILL.md file', () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(1);
      });

      it('creates SKILL.md at correct path without target prefix', () => {
        expect(fileUpdates.createOrUpdate[0].path).toBe(
          `.cursor/skills/${skillVersions[0].slug}/SKILL.md`,
        );
      });

      it('includes name in frontmatter', () => {
        const content = fileUpdates.createOrUpdate[0].content;
        expect(content).toContain(`name: '${skillVersions[0].name}'`);
      });

      it('includes description in frontmatter', () => {
        const content = fileUpdates.createOrUpdate[0].content;
        expect(content).toContain(
          `description: '${skillVersions[0].description}'`,
        );
      });

      it('includes license in frontmatter', () => {
        const content = fileUpdates.createOrUpdate[0].content;
        expect(content).toContain(`license: '${skillVersions[0].license}'`);
      });
    });

    describe('when skill has additional files', () => {
      let fileUpdates: Awaited<
        ReturnType<typeof deployer.generateFileUpdatesForSkills>
      >;

      beforeEach(async () => {
        const skillVersionsWithFiles = [
          skillVersionFactory({
            files: [
              {
                id: createSkillFileId('file-1'),
                skillVersionId: createSkillVersionId('skill-version-1'),
                path: 'helper.ts',
                content: 'export const helper = () => {}',
                permissions: 'rw-r--r--',
              },
            ],
          }),
        ];

        fileUpdates = await deployer.generateFileUpdatesForSkills(
          skillVersionsWithFiles,
        );
      });

      it('creates SKILL.md and helper file', () => {
        expect(fileUpdates.createOrUpdate).toHaveLength(2);
      });

      it('includes helper file at correct path', () => {
        const helperFile = fileUpdates.createOrUpdate.find((f) =>
          f.path.endsWith('helper.ts'),
        );
        expect(helperFile).toBeDefined();
      });
    });

    describe('when skill has SKILL.MD in additional files', () => {
      let fileUpdates: Awaited<
        ReturnType<typeof deployer.generateFileUpdatesForSkills>
      >;

      beforeEach(async () => {
        const skillVersionsWithFiles = [
          skillVersionFactory({
            files: [
              {
                id: createSkillFileId('file-1'),
                skillVersionId: createSkillVersionId('skill-version-1'),
                path: 'SKILL.MD',
                content: 'This should be ignored',
                permissions: 'rw-r--r--',
              },
              {
                id: createSkillFileId('file-2'),
                skillVersionId: createSkillVersionId('skill-version-1'),
                path: 'reference.md',
                content: 'Reference content',
                permissions: 'rw-r--r--',
              },
            ],
          }),
        ];

        fileUpdates = await deployer.generateFileUpdatesForSkills(
          skillVersionsWithFiles,
        );
      });

      it('creates only generated SKILL.md and other files', () => {
        const skillMdFiles = fileUpdates.createOrUpdate.filter((file) =>
          file.path.toUpperCase().endsWith('SKILL.MD'),
        );
        expect(skillMdFiles).toHaveLength(1);
      });

      it('does not include duplicate SKILL.MD content', () => {
        const skillMdFiles = fileUpdates.createOrUpdate.filter((file) =>
          file.path.toUpperCase().endsWith('SKILL.MD'),
        );
        expect(skillMdFiles[0].content).not.toContain('This should be ignored');
      });
    });
  });

  describe('generateRemovalFileUpdates', () => {
    let skillVersions: SkillVersion[];

    beforeEach(() => {
      skillVersions = [
        skillVersionFactory({
          slug: 'test-skill',
        }),
      ];
    });

    describe('when removing skills', () => {
      it('deletes skill directory', async () => {
        const fileUpdates = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: skillVersions,
          },
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
        );

        expect(fileUpdates.delete).toContainEqual({
          path: `.cursor/skills/${skillVersions[0].slug}`,
          type: DeleteItemType.Directory,
        });
      });
    });

    describe('when removing multiple skills', () => {
      let fileUpdates: Awaited<
        ReturnType<typeof deployer.generateRemovalFileUpdates>
      >;

      beforeEach(async () => {
        const multipleSkillVersions = [
          skillVersionFactory({ slug: 'skill-1' }),
          skillVersionFactory({ slug: 'skill-2' }),
        ];

        fileUpdates = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: multipleSkillVersions,
          },
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
        );
      });

      it('deletes first skill directory', () => {
        expect(fileUpdates.delete).toContainEqual({
          path: `.cursor/skills/skill-1`,
          type: DeleteItemType.Directory,
        });
      });

      it('deletes second skill directory', () => {
        expect(fileUpdates.delete).toContainEqual({
          path: `.cursor/skills/skill-2`,
          type: DeleteItemType.Directory,
        });
      });
    });
  });

  describe('generateAgentCleanupFileUpdates', () => {
    describe('when generating cleanup file updates', () => {
      let result: Awaited<
        ReturnType<typeof deployer.generateAgentCleanupFileUpdates>
      >;
      let userPackageSkillVersions: SkillVersion[];

      beforeEach(async () => {
        userPackageSkillVersions = [
          skillVersionFactory({ slug: 'user-skill-1' }),
          skillVersionFactory({ slug: 'user-skill-2' }),
        ];

        result = await deployer.generateAgentCleanupFileUpdates({
          recipeVersions: [],
          standardVersions: [],
          skillVersions: userPackageSkillVersions,
        });
      });

      it('deletes the commands folder', () => {
        expect(
          result.delete.some(
            (item) =>
              item.path === '.cursor/commands/packmind' &&
              item.type === DeleteItemType.Directory,
          ),
        ).toBe(true);
      });

      it('deletes the standards folder', () => {
        expect(
          result.delete.some(
            (item) =>
              item.path === '.cursor/rules/packmind/' &&
              item.type === DeleteItemType.Directory,
          ),
        ).toBe(true);
      });

      it('does not delete the entire skills folder', () => {
        expect(
          result.delete.some((item) => item.path === '.cursor/skills/'),
        ).toBe(false);
      });

      it('deletes legacy recipes-index.mdc file', () => {
        expect(
          result.delete.some(
            (item) =>
              item.path === '.cursor/rules/packmind/recipes-index.mdc' &&
              item.type === DeleteItemType.File,
          ),
        ).toBe(true);
      });
    });

    describe('when deleting default skills', () => {
      let result: Awaited<
        ReturnType<typeof deployer.generateAgentCleanupFileUpdates>
      >;

      beforeEach(async () => {
        result = await deployer.generateAgentCleanupFileUpdates({
          recipeVersions: [],
          standardVersions: [],
          skillVersions: [],
        });
      });

      it('deletes packmind-create-skill default skill', () => {
        expect(
          result.delete.some(
            (item) =>
              item.path === '.cursor/skills/packmind-create-skill' &&
              item.type === DeleteItemType.Directory,
          ),
        ).toBe(true);
      });

      it('deletes packmind-create-standard default skill', () => {
        expect(
          result.delete.some(
            (item) =>
              item.path === '.cursor/skills/packmind-create-standard' &&
              item.type === DeleteItemType.Directory,
          ),
        ).toBe(true);
      });

      it('deletes packmind-onboard default skill', () => {
        expect(
          result.delete.some(
            (item) =>
              item.path === '.cursor/skills/packmind-onboard' &&
              item.type === DeleteItemType.Directory,
          ),
        ).toBe(true);
      });

      it('deletes packmind-create-command default skill', () => {
        expect(
          result.delete.some(
            (item) =>
              item.path === '.cursor/skills/packmind-create-command' &&
              item.type === DeleteItemType.Directory,
          ),
        ).toBe(true);
      });

      it('deletes packmind-create-package default skill', () => {
        expect(
          result.delete.some(
            (item) =>
              item.path === '.cursor/skills/packmind-create-package' &&
              item.type === DeleteItemType.Directory,
          ),
        ).toBe(true);
      });

      it('deletes packmind-cli-list-commands default skill', () => {
        expect(
          result.delete.some(
            (item) =>
              item.path === '.cursor/skills/packmind-cli-list-commands' &&
              item.type === DeleteItemType.Directory,
          ),
        ).toBe(true);
      });
    });

    describe('when deleting user package skills', () => {
      let result: Awaited<
        ReturnType<typeof deployer.generateAgentCleanupFileUpdates>
      >;
      let userPackageSkillVersions: SkillVersion[];

      beforeEach(async () => {
        userPackageSkillVersions = [
          skillVersionFactory({ slug: 'my-custom-skill' }),
          skillVersionFactory({ slug: 'another-package-skill' }),
        ];

        result = await deployer.generateAgentCleanupFileUpdates({
          recipeVersions: [],
          standardVersions: [],
          skillVersions: userPackageSkillVersions,
        });
      });

      it('deletes my-custom-skill user package skill', () => {
        expect(
          result.delete.some(
            (item) =>
              item.path === '.cursor/skills/my-custom-skill' &&
              item.type === DeleteItemType.Directory,
          ),
        ).toBe(true);
      });

      it('deletes another-package-skill user package skill', () => {
        expect(
          result.delete.some(
            (item) =>
              item.path === '.cursor/skills/another-package-skill' &&
              item.type === DeleteItemType.Directory,
          ),
        ).toBe(true);
      });
    });

    describe('when user has skills not managed by Packmind', () => {
      let result: Awaited<
        ReturnType<typeof deployer.generateAgentCleanupFileUpdates>
      >;

      beforeEach(async () => {
        result = await deployer.generateAgentCleanupFileUpdates({
          recipeVersions: [],
          standardVersions: [],
          skillVersions: [skillVersionFactory({ slug: 'managed-skill' })],
        });
      });

      it('does not include unmanaged skill in delete list', () => {
        expect(
          result.delete.some(
            (item) => item.path === '.cursor/skills/user-created-skill',
          ),
        ).toBe(false);
      });

      it('only deletes skills that are explicitly managed', () => {
        const skillDeleteItems = result.delete.filter((item) =>
          item.path.startsWith('.cursor/skills/'),
        );

        // Should include: 6 default skills + 1 managed skill = 7 total
        expect(skillDeleteItems).toHaveLength(7);
      });
    });
  });

  describe('deployArtifacts', () => {
    describe('when deploying artifacts with skills', () => {
      let fileUpdates: Awaited<ReturnType<typeof deployer.deployArtifacts>>;
      let skillVersions: SkillVersion[];

      beforeEach(async () => {
        skillVersions = [
          skillVersionFactory({
            name: 'Test Skill',
            slug: 'test-skill',
            prompt: 'Test skill prompt',
          }),
        ];

        fileUpdates = await deployer.deployArtifacts([], [], skillVersions);
      });

      it('creates skill file', () => {
        expect(fileUpdates.createOrUpdate.length).toBeGreaterThan(0);
      });

      it('creates skill file in correct location', () => {
        const skillFile = fileUpdates.createOrUpdate.find((file) =>
          file.path.includes('.cursor/skills/'),
        );
        expect(skillFile).toBeDefined();
      });

      it('creates skill file with correct path', () => {
        const skillFile = fileUpdates.createOrUpdate.find((file) =>
          file.path.includes('.cursor/skills/'),
        );
        expect(skillFile?.path).toBe(
          `.cursor/skills/${skillVersions[0].slug}/SKILL.md`,
        );
      });

      it('includes skill prompt in file content', () => {
        const skillFile = fileUpdates.createOrUpdate.find((file) =>
          file.path.includes('.cursor/skills/'),
        );
        expect(skillFile?.content).toContain('Test skill prompt');
      });
    });

    describe('when deploying artifacts with multi-file skills', () => {
      it('includes all skill files', async () => {
        const skillVersionsWithFiles = [
          skillVersionFactory({
            files: [
              {
                id: createSkillFileId('file-1'),
                skillVersionId: createSkillVersionId('skill-version-1'),
                path: 'helper.ts',
                content: 'export const helper = () => {}',
                permissions: 'rw-r--r--',
              },
            ],
          }),
        ];

        const fileUpdates = await deployer.deployArtifacts(
          [],
          [],
          skillVersionsWithFiles,
        );

        const skillFiles = fileUpdates.createOrUpdate.filter((file) =>
          file.path.includes('.cursor/skills/'),
        );
        expect(skillFiles.length).toBe(2);
      });
    });
  });
});
