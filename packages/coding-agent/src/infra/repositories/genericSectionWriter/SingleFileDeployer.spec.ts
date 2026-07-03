import { createUserId } from '@packmind/types';
import {
  createRecipeId,
  createRecipeVersionId,
  RecipeVersion,
  createStandardId,
  createStandardVersionId,
  StandardVersion,
  GitRepo,
  Target,
  createTargetId,
  createGitRepoId,
  createGitProviderId,
  RuleId,
  FileUpdates,
} from '@packmind/types';
import { SingleFileDeployer, DeployerConfig } from './SingleFileDeployer';
import { v4 as uuidv4 } from 'uuid';
import { IStandardsPort, IGitPort } from '@packmind/types';

// Create a concrete test implementation of the abstract SingleFileDeployer
class TestSingleFileDeployer extends SingleFileDeployer {
  protected readonly config: DeployerConfig = {
    filePath: 'TEST_AGENT.md',
    agentName: 'TestAgent',
  };
}

describe('SingleFileDeployer', () => {
  let deployer: TestSingleFileDeployer;
  let mockGitPort: jest.Mocked<IGitPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockGitRepo: GitRepo;
  let jetbrainsTarget: Target;
  let vscodeTarget: Target;

  beforeEach(() => {
    mockGitPort = {
      getFileFromRepo: jest.fn(),
    } as unknown as jest.Mocked<IGitPort>;
    mockStandardsPort = {} as unknown as jest.Mocked<IStandardsPort>;

    deployer = new TestSingleFileDeployer(mockStandardsPort, mockGitPort);

    mockGitRepo = {
      id: createGitRepoId('test-repo-id'),
      owner: 'testowner',
      repo: 'testrepo',
      branch: 'main',
      providerId: createGitProviderId('test-provider-id'),
    };

    jetbrainsTarget = {
      id: createTargetId(uuidv4()),
      name: 'jetbrains',
      path: '/jetbrains/',
      gitRepoId: mockGitRepo.id,
    };

    vscodeTarget = {
      id: createTargetId(uuidv4()),
      name: 'vscode',
      path: '/vscode/',
      gitRepoId: mockGitRepo.id,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deployRecipes', () => {
    const mockRecipeVersions: RecipeVersion[] = [
      {
        id: createRecipeVersionId('recipe-version-1'),
        recipeId: createRecipeId('recipe-1'),
        name: 'Test Recipe',
        slug: 'test-recipe',
        content: '# Test Recipe Content',
        version: 1,
        userId: createUserId('user-1'),
      },
    ];

    describe('when deploying recipes', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        result = await deployer.deployRecipes(
          mockRecipeVersions,
          mockGitRepo,
          jetbrainsTarget,
        );
      });

      it('returns one createOrUpdate entry', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('uses target-prefixed path for the file', () => {
        expect(result.createOrUpdate[0].path).toBe('jetbrains/TEST_AGENT.md');
      });

      it('includes one section in the file update', () => {
        expect(result.createOrUpdate[0].sections).toHaveLength(1);
      });

      it('sets section key to Packmind recipes', () => {
        expect(result.createOrUpdate[0].sections![0].key).toBe(
          'Packmind recipes',
        );
      });

      it('sets section content to empty string to clear recipes', () => {
        expect(result.createOrUpdate[0].sections![0].content).toBe('');
      });

      it('does not delete any files', () => {
        expect(result.delete).toHaveLength(0);
      });
    });
  });

  describe('deployStandards', () => {
    const mockStandardVersions: StandardVersion[] = [
      {
        id: createStandardVersionId('standard-version-1'),
        standardId: createStandardId('standard-1'),
        name: 'Test Standard',
        slug: 'test-standard',
        description: 'Test standard description',
        version: 1,
        userId: createUserId('user-1'),
        scope: 'test',
      },
    ];

    describe('when standard has a description', () => {
      let result: FileUpdates;
      let sectionContent: string;

      beforeEach(async () => {
        const standardWithDescription: StandardVersion[] = [
          {
            id: createStandardVersionId('standard-version-1'),
            standardId: createStandardId('standard-1'),
            name: 'Standard Without Summary',
            slug: 'standard-without-summary',
            description: 'This is the description',
            version: 1,
            userId: createUserId('user-1'),
            scope: 'test',
          },
        ];

        mockGitPort.getFileFromRepo.mockResolvedValue(null);

        result = await deployer.deployStandards(
          standardWithDescription,
          mockGitRepo,
          vscodeTarget,
        );
        sectionContent = result.createOrUpdate[0].sections![0].content;
      });

      it('returns one createOrUpdate entry', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('does not contain null at end of line', () => {
        expect(sectionContent).not.toMatch(/:\s*null\s*$/m);
      });

      it('does not contain null followed by newline', () => {
        expect(sectionContent).not.toMatch(/:\s*null\n/);
      });

      it('uses description as fallback', () => {
        expect(sectionContent).toContain('This is the description :');
      });

      it('includes no rules defined message', () => {
        expect(sectionContent).toContain('* No rules defined yet.');
      });

      it('includes link to full standard', () => {
        expect(sectionContent).toContain(
          'Full standard is available here for further request: [Standard Without Summary](.packmind/standards/standard-without-summary.md)',
        );
      });
    });

    describe('when standard has long description (over 200 chars)', () => {
      let result: FileUpdates;
      let sectionContent: string;

      beforeEach(async () => {
        const standardWithLongDescription: StandardVersion[] = [
          {
            id: createStandardVersionId('standard-version-1'),
            standardId: createStandardId('standard-1'),
            name: 'Standard With Long Description',
            slug: 'standard-long-description',
            description: 'A'.repeat(250),
            version: 1,
            userId: createUserId('user-1'),
            scope: 'test',
          },
        ];

        mockGitPort.getFileFromRepo.mockResolvedValue(null);

        result = await deployer.deployStandards(
          standardWithLongDescription,
          mockGitRepo,
          vscodeTarget,
        );
        sectionContent = result.createOrUpdate[0].sections![0].content;
      });

      it('returns one createOrUpdate entry', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('truncates description at 200 characters with ellipsis', () => {
        expect(sectionContent).toContain(`${'A'.repeat(200)}... :`);
      });

      it('includes no rules defined message', () => {
        expect(sectionContent).toContain('* No rules defined yet.');
      });

      it('includes link to full standard', () => {
        expect(sectionContent).toContain(
          'Full standard is available here for further request: [Standard With Long Description](.packmind/standards/standard-long-description.md)',
        );
      });

      it('does not include the full 250 character description', () => {
        expect(sectionContent).not.toContain('A'.repeat(250));
      });
    });

    describe('when standard has multiline description', () => {
      let result: FileUpdates;
      let sectionContent: string;

      beforeEach(async () => {
        const standardWithMultilineDescription: StandardVersion[] = [
          {
            id: createStandardVersionId('standard-version-1'),
            standardId: createStandardId('standard-1'),
            name: 'Standard With Multiline',
            slug: 'standard-multiline',
            description:
              'First line of description\nSecond line should not appear\nThird line also not',
            version: 1,
            userId: createUserId('user-1'),
            scope: 'test',
          },
        ];

        mockGitPort.getFileFromRepo.mockResolvedValue(null);

        result = await deployer.deployStandards(
          standardWithMultilineDescription,
          mockGitRepo,
          vscodeTarget,
        );
        sectionContent = result.createOrUpdate[0].sections![0].content;
      });

      it('returns one createOrUpdate entry', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('includes only the first line of description', () => {
        expect(sectionContent).toContain('First line of description :');
      });

      it('includes no rules defined message', () => {
        expect(sectionContent).toContain('* No rules defined yet.');
      });

      it('includes link to full standard', () => {
        expect(sectionContent).toContain(
          'Full standard is available here for further request: [Standard With Multiline](.packmind/standards/standard-multiline.md)',
        );
      });

      it('does not include second line of description', () => {
        expect(sectionContent).not.toContain('Second line');
      });

      it('does not include third line of description', () => {
        expect(sectionContent).not.toContain('Third line');
      });
    });

    describe('when standard has null description', () => {
      let result: FileUpdates;
      let sectionContent: string;

      beforeEach(async () => {
        const standardWithNullDescription: StandardVersion[] = [
          {
            id: createStandardVersionId('standard-version-1'),
            standardId: createStandardId('standard-1'),
            name: 'Standard Name Only',
            slug: 'standard-name-only',
            description: null as unknown as string,
            version: 1,
            userId: createUserId('user-1'),
            scope: 'test',
          },
        ];

        mockGitPort.getFileFromRepo.mockResolvedValue(null);

        result = await deployer.deployStandards(
          standardWithNullDescription,
          mockGitRepo,
          vscodeTarget,
        );
        sectionContent = result.createOrUpdate[0].sections![0].content;
      });

      it('returns one createOrUpdate entry', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('does not contain null at end of line', () => {
        expect(sectionContent).not.toMatch(/:\s*null\s*$/m);
      });

      it('does not contain null followed by newline', () => {
        expect(sectionContent).not.toMatch(/:\s*null\n/);
      });

      it('displays summary unavailable message', () => {
        expect(sectionContent).toContain('Summary unavailable :');
      });

      it('includes no rules defined message', () => {
        expect(sectionContent).toContain('* No rules defined yet.');
      });

      it('includes link to full standard', () => {
        expect(sectionContent).toContain(
          'Full standard is available here for further request: [Standard Name Only](.packmind/standards/standard-name-only.md)',
        );
      });
    });

    describe('when deploying standards with target', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        result = await deployer.deployStandards(
          mockStandardVersions,
          mockGitRepo,
          vscodeTarget,
        );
      });

      it('returns one createOrUpdate entry', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('uses target-prefixed path for the file', () => {
        expect(result.createOrUpdate[0].path).toBe('vscode/TEST_AGENT.md');
      });
    });

    describe('determinism — rendered content does not depend on input order', () => {
      const buildStandard = (slug: string, name: string): StandardVersion => ({
        id: createStandardVersionId(`standard-version-${slug}`),
        standardId: createStandardId(`standard-${slug}`),
        name,
        slug,
        description: `${name} description`,
        version: 1,
        userId: createUserId('user-1'),
        scope: 'test',
      });

      // Names are intentionally reversed vs slugs so the test fails if the
      // implementation sorts by name instead of slug.
      const standardA = buildStandard('alpha-standard', 'Zeta Standard');
      const standardB = buildStandard('beta-standard', 'Yankee Standard');
      const standardC = buildStandard('charlie-standard', 'Xray Standard');

      beforeEach(() => {
        mockGitPort.getFileFromRepo.mockResolvedValue(null);
      });

      const getStandardsSectionContent = async (
        standardVersions: StandardVersion[],
      ): Promise<string> => {
        const result = await deployer.deployStandards(
          standardVersions,
          mockGitRepo,
          jetbrainsTarget,
        );
        return result.createOrUpdate[0].sections![0].content;
      };

      describe('produces byte-identical content for any input order via deployStandards', () => {
        let orderA: string;
        let orderB: string;
        let orderC: string;

        beforeEach(async () => {
          orderA = await getStandardsSectionContent([
            standardA,
            standardB,
            standardC,
          ]);
          orderB = await getStandardsSectionContent([
            standardC,
            standardA,
            standardB,
          ]);
          orderC = await getStandardsSectionContent([
            standardB,
            standardC,
            standardA,
          ]);
        });

        it('produces the same content for order A and order B', () => {
          expect(orderA).toBe(orderB);
        });

        it('produces the same content for order A and order C', () => {
          expect(orderA).toBe(orderC);
        });
      });

      describe('renders standards alphabetically by slug (not by name)', () => {
        let zetaIndex: number;
        let yankeeIndex: number;
        let xrayIndex: number;

        beforeEach(async () => {
          const content = await getStandardsSectionContent([
            standardC,
            standardA,
            standardB,
          ]);

          // Slug order: alpha-standard < beta-standard < charlie-standard
          // → expected display order: Zeta (alpha), Yankee (beta), Xray (charlie)
          zetaIndex = content.indexOf('# Standard: Zeta Standard');
          yankeeIndex = content.indexOf('# Standard: Yankee Standard');
          xrayIndex = content.indexOf('# Standard: Xray Standard');
        });

        it('includes Zeta Standard in the output', () => {
          expect(zetaIndex).toBeGreaterThan(-1);
        });

        it('renders Zeta Standard before Yankee Standard', () => {
          expect(zetaIndex).toBeLessThan(yankeeIndex);
        });

        it('renders Yankee Standard before Xray Standard', () => {
          expect(yankeeIndex).toBeLessThan(xrayIndex);
        });
      });

      it('produces byte-identical content via deployArtifacts regardless of input order', async () => {
        const sectionFor = async (
          standardVersions: StandardVersion[],
        ): Promise<string> => {
          const result = await deployer.deployArtifacts([], standardVersions);
          const standards = result.createOrUpdate[0].sections!.find(
            (s) => s.key === 'Packmind standards',
          );
          return standards!.content;
        };

        const orderA = await sectionFor([standardA, standardB, standardC]);
        const orderB = await sectionFor([standardC, standardB, standardA]);

        expect(orderA).toBe(orderB);
      });

      it('produces byte-identical content via generateFileUpdatesForStandards regardless of input order', async () => {
        const contentFor = async (
          standardVersions: StandardVersion[],
        ): Promise<string> => {
          const result =
            await deployer.generateFileUpdatesForStandards(standardVersions);
          return result.createOrUpdate[0].content as string;
        };

        const orderA = await contentFor([standardA, standardB, standardC]);
        const orderB = await contentFor([standardC, standardB, standardA]);

        expect(orderA).toBe(orderB);
      });
    });
  });

  describe('error handling in getExistingContent', () => {
    describe('when gitPort throws an error', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        const mockRecipeVersions: RecipeVersion[] = [];
        mockGitPort.getFileFromRepo.mockRejectedValue(new Error('Git error'));

        result = await deployer.deployRecipes(
          mockRecipeVersions,
          mockGitRepo,
          jetbrainsTarget,
        );
      });

      it('returns one createOrUpdate entry', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('sets section key to Packmind recipes', () => {
        expect(result.createOrUpdate[0].sections![0].key).toBe(
          'Packmind recipes',
        );
      });

      it('sets section content to empty string', () => {
        expect(result.createOrUpdate[0].sections![0].content).toBe('');
      });

      it('does not delete any files', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when gitPort is missing', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        const deployerWithoutGit = new TestSingleFileDeployer(); // No gitPort
        const mockRecipeVersions: RecipeVersion[] = [];

        result = await deployerWithoutGit.deployRecipes(
          mockRecipeVersions,
          mockGitRepo,
          jetbrainsTarget,
        );
      });

      it('returns one createOrUpdate entry', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('sets section key to Packmind recipes', () => {
        expect(result.createOrUpdate[0].sections![0].key).toBe(
          'Packmind recipes',
        );
      });

      it('sets section content to empty string', () => {
        expect(result.createOrUpdate[0].sections![0].content).toBe('');
      });

      it('does not delete any files', () => {
        expect(result.delete).toHaveLength(0);
      });
    });
  });

  describe('deployArtifacts', () => {
    const mockRecipeVersions: RecipeVersion[] = [
      {
        id: createRecipeVersionId('recipe-version-1'),
        recipeId: createRecipeId('recipe-1'),
        name: 'Test Recipe',
        slug: 'test-recipe',
        content: '# Test Recipe Content',
        version: 1,
        userId: createUserId('user-1'),
      },
    ];

    const mockStandardVersions: StandardVersion[] = [
      {
        id: createStandardVersionId('standard-version-1'),
        standardId: createStandardId('standard-1'),
        name: 'Test Standard',
        slug: 'test-standard',
        description: 'Test standard description',
        version: 1,
        userId: createUserId('user-1'),
        scope: 'test',
      },
    ];

    describe('when deploying both recipes and standards', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        result = await deployer.deployArtifacts(
          mockRecipeVersions,
          mockStandardVersions,
        );
      });

      it('returns one createOrUpdate entry', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('sets file path to base agent file', () => {
        expect(result.createOrUpdate[0].path).toBe('TEST_AGENT.md');
      });

      it('includes two sections in the file update', () => {
        expect(result.createOrUpdate[0].sections).toHaveLength(2);
      });

      it('includes Packmind recipes section', () => {
        const recipesSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind recipes',
        );
        expect(recipesSection).toBeDefined();
      });

      it('sets recipes section content to empty string', () => {
        const recipesSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind recipes',
        );
        expect(recipesSection!.content).toBe('');
      });

      it('includes Packmind standards section', () => {
        const standardsSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind standards',
        );
        expect(standardsSection).toBeDefined();
      });

      it('includes standard name in standards section content', () => {
        const standardsSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind standards',
        );
        expect(standardsSection!.content).toContain(
          '# Standard: Test Standard',
        );
      });

      it('does not include target prefix in path', () => {
        expect(result.createOrUpdate[0].path).not.toContain('jetbrains');
      });

      it('does not include vscode prefix in path', () => {
        expect(result.createOrUpdate[0].path).not.toContain('vscode');
      });
    });

    describe('when recipes are empty', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        result = await deployer.deployArtifacts([], mockStandardVersions);
      });

      it('returns one createOrUpdate entry', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('includes two sections in the file update', () => {
        expect(result.createOrUpdate[0].sections).toHaveLength(2);
      });

      it('includes Packmind recipes section', () => {
        const recipesSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind recipes',
        );
        expect(recipesSection).toBeDefined();
      });

      it('sets recipes section content to empty string', () => {
        const recipesSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind recipes',
        );
        expect(recipesSection!.content).toBe('');
      });

      it('includes Packmind standards section', () => {
        const standardsSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind standards',
        );
        expect(standardsSection).toBeDefined();
      });

      it('includes standard name in standards section content', () => {
        const standardsSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind standards',
        );
        expect(standardsSection!.content).toContain(
          '# Standard: Test Standard',
        );
      });
    });

    describe('when standards are empty', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        result = await deployer.deployArtifacts(mockRecipeVersions, []);
      });

      it('returns one createOrUpdate entry', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('includes one section in the file update', () => {
        expect(result.createOrUpdate[0].sections).toHaveLength(1);
      });

      it('sets section key to Packmind recipes', () => {
        expect(result.createOrUpdate[0].sections![0].key).toBe(
          'Packmind recipes',
        );
      });

      it('sets section content to empty string', () => {
        expect(result.createOrUpdate[0].sections![0].content).toBe('');
      });

      it('does not delete any files', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when both recipes and standards are empty', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        result = await deployer.deployArtifacts([], []);
      });

      it('returns one createOrUpdate entry', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('includes one section in the file update', () => {
        expect(result.createOrUpdate[0].sections).toHaveLength(1);
      });

      it('sets section key to Packmind recipes', () => {
        expect(result.createOrUpdate[0].sections![0].key).toBe(
          'Packmind recipes',
        );
      });

      it('sets section content to empty string', () => {
        expect(result.createOrUpdate[0].sections![0].content).toBe('');
      });

      it('does not delete any files', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when rules not present on standards', () => {
      let result: FileUpdates;
      const mockRules = [
        {
          id: 'rule-1',
          standardId: createStandardId('standard-1'),
          content: 'Test rule content',
          order: 1,
        },
      ];

      beforeEach(async () => {
        mockStandardsPort.getRulesByStandardId = jest
          .fn()
          .mockResolvedValue(mockRules);

        const standardWithoutRules = [
          {
            ...mockStandardVersions[0],
            rules: undefined,
          },
        ];

        result = await deployer.deployArtifacts([], standardWithoutRules);
      });

      it('calls getRulesByStandardId with the standard id', () => {
        expect(mockStandardsPort.getRulesByStandardId).toHaveBeenCalledWith(
          mockStandardVersions[0].standardId,
        );
      });

      it('returns one createOrUpdate entry', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('includes rule content in standards section', () => {
        const standardsSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind standards',
        );
        expect(standardsSection!.content).toContain('Test rule content');
      });
    });

    describe('when rules present on standard version', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        mockStandardsPort.getRulesByStandardId = jest.fn();

        const standardWithRules = [
          {
            ...mockStandardVersions[0],
            rules: [
              {
                id: 'rule-1' as RuleId,
                standardVersionId: mockStandardVersions[0].id,
                content: 'Existing rule',
              },
            ],
          },
        ];

        result = await deployer.deployArtifacts([], standardWithRules);
      });

      it('does not call getRulesByStandardId', () => {
        expect(mockStandardsPort.getRulesByStandardId).not.toHaveBeenCalled();
      });

      it('returns one createOrUpdate entry', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('includes existing rule content in standards section', () => {
        const standardsSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind standards',
        );
        expect(standardsSection!.content).toContain('Existing rule');
      });
    });

    describe('when standard has null description', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        const standardWithNullDescription = [
          {
            ...mockStandardVersions[0],
            description: null as unknown as string,
          },
        ];

        result = await deployer.deployArtifacts([], standardWithNullDescription);
      });

      it('returns one createOrUpdate entry', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('includes two sections in the file update', () => {
        expect(result.createOrUpdate[0].sections).toHaveLength(2);
      });

      it('includes Packmind recipes section', () => {
        const recipesSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind recipes',
        );
        expect(recipesSection).toBeDefined();
      });

      it('sets recipes section content to empty string', () => {
        const recipesSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind recipes',
        );
        expect(recipesSection!.content).toBe('');
      });

      it('does not output null at end of line in standards section', () => {
        const standardsSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind standards',
        );
        expect(standardsSection!.content).not.toMatch(/:\s*null\s*$/m);
      });

      it('does not output null followed by newline in standards section', () => {
        const standardsSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind standards',
        );
        expect(standardsSection!.content).not.toMatch(/:\s*null\n/);
      });
    });
  });

  describe('generateRemovalFileUpdates', () => {
    describe('when all recipes are removed and none remain installed', () => {
      const removedRecipes: RecipeVersion[] = [
        {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: createRecipeId('recipe-1'),
          name: 'Removed Recipe',
          slug: 'removed-recipe',
          content: '# Removed Recipe',
          version: 1,
          userId: createUserId('user-1'),
        },
      ];

      let result: FileUpdates;

      beforeEach(async () => {
        result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: removedRecipes,
            standardVersions: [],
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
        );
      });

      it('returns one createOrUpdate entry', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('includes one section in the file update', () => {
        expect(result.createOrUpdate[0].sections).toHaveLength(1);
      });

      it('sets section key to Packmind recipes', () => {
        expect(result.createOrUpdate[0].sections![0].key).toBe(
          'Packmind recipes',
        );
      });

      it('sets section content to empty string', () => {
        expect(result.createOrUpdate[0].sections![0].content).toBe('');
      });

      it('does not delete any files', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when all standards are removed and none remain installed', () => {
      const removedStandards: StandardVersion[] = [
        {
          id: createStandardVersionId('standard-version-1'),
          standardId: createStandardId('standard-1'),
          name: 'Removed Standard',
          slug: 'removed-standard',
          description: 'Removed',
          version: 1,
          userId: createUserId('user-1'),
          scope: 'test',
        },
      ];

      let result: FileUpdates;

      beforeEach(async () => {
        result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [],
            standardVersions: removedStandards,
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
        );
      });

      it('generates one createOrUpdate entry to clear both sections', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('generates two sections in the createOrUpdate entry (recipes and standards)', () => {
        expect(result.createOrUpdate[0].sections).toHaveLength(2);
      });

      it('includes Packmind recipes section', () => {
        const recipesSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind recipes',
        );
        expect(recipesSection).toBeDefined();
      });

      it('sets Packmind recipes section content to empty', () => {
        const recipesSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind recipes',
        );
        expect(recipesSection!.content).toBe('');
      });

      it('includes Packmind standards section', () => {
        const standardsSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind standards',
        );
        expect(standardsSection).toBeDefined();
      });

      it('sets Packmind standards section content to empty', () => {
        const standardsSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind standards',
        );
        expect(standardsSection!.content).toBe('');
      });

      it('does not delete the file', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when standards are removed but others remain installed', () => {
      const removedStandards: StandardVersion[] = [
        {
          id: createStandardVersionId('standard-version-1'),
          standardId: createStandardId('standard-1'),
          name: 'Removed Standard',
          slug: 'removed-standard',
          description: 'Removed',
          version: 1,
          userId: createUserId('user-1'),
          scope: 'test',
        },
      ];

      const installedStandards: StandardVersion[] = [
        {
          id: createStandardVersionId('standard-version-2'),
          standardId: createStandardId('standard-2'),
          name: 'Installed Standard',
          slug: 'installed-standard',
          description: 'Installed',
          version: 1,
          userId: createUserId('user-1'),
          scope: 'test',
        },
      ];

      let result: FileUpdates;

      beforeEach(async () => {
        result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [],
            standardVersions: removedStandards,
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: installedStandards,
            skillVersions: [],
          },
        );
      });

      it('returns one createOrUpdate entry', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('includes one section in the file update', () => {
        expect(result.createOrUpdate[0].sections).toHaveLength(1);
      });

      it('sets section key to Packmind recipes', () => {
        expect(result.createOrUpdate[0].sections![0].key).toBe(
          'Packmind recipes',
        );
      });

      it('sets section content to empty string', () => {
        expect(result.createOrUpdate[0].sections![0].content).toBe('');
      });

      it('does not generate delete entries', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when all recipes and standards are removed and none remain installed', () => {
      const removedRecipes: RecipeVersion[] = [
        {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: createRecipeId('recipe-1'),
          name: 'Removed Recipe',
          slug: 'removed-recipe',
          content: '# Removed Recipe',
          version: 1,
          userId: createUserId('user-1'),
        },
      ];
      const removedStandards: StandardVersion[] = [
        {
          id: createStandardVersionId('standard-version-1'),
          standardId: createStandardId('standard-1'),
          name: 'Removed Standard',
          slug: 'removed-standard',
          description: 'Removed',
          version: 1,
          userId: createUserId('user-1'),
          scope: 'test',
        },
      ];

      let result: FileUpdates;

      beforeEach(async () => {
        result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: removedRecipes,
            standardVersions: removedStandards,
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
        );
      });

      it('generates one createOrUpdate entry to clear both sections', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('generates two sections in the createOrUpdate entry (recipes and standards)', () => {
        expect(result.createOrUpdate[0].sections).toHaveLength(2);
      });

      it('includes Packmind recipes section', () => {
        const recipesSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind recipes',
        );
        expect(recipesSection).toBeDefined();
      });

      it('sets Packmind recipes section content to empty', () => {
        const recipesSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind recipes',
        );
        expect(recipesSection!.content).toBe('');
      });

      it('includes Packmind standards section', () => {
        const standardsSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind standards',
        );
        expect(standardsSection).toBeDefined();
      });

      it('sets Packmind standards section content to empty', () => {
        const standardsSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind standards',
        );
        expect(standardsSection!.content).toBe('');
      });

      it('does not delete the file', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when all recipes are removed but standards remain installed', () => {
      const removedRecipes: RecipeVersion[] = [
        {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: createRecipeId('recipe-1'),
          name: 'Removed Recipe',
          slug: 'removed-recipe',
          content: '# Removed Recipe',
          version: 1,
          userId: createUserId('user-1'),
        },
      ];

      const installedStandards: StandardVersion[] = [
        {
          id: createStandardVersionId('standard-version-1'),
          standardId: createStandardId('standard-1'),
          name: 'Installed Standard',
          slug: 'installed-standard',
          description: 'Installed',
          version: 1,
          userId: createUserId('user-1'),
          scope: 'test',
        },
      ];

      let result: FileUpdates;

      beforeEach(async () => {
        result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: removedRecipes,
            standardVersions: [],
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: installedStandards,
            skillVersions: [],
          },
        );
      });

      it('returns one createOrUpdate entry', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('includes one section in the file update', () => {
        expect(result.createOrUpdate[0].sections).toHaveLength(1);
      });

      it('sets section key to Packmind recipes', () => {
        expect(result.createOrUpdate[0].sections![0].key).toBe(
          'Packmind recipes',
        );
      });

      it('sets section content to empty string', () => {
        expect(result.createOrUpdate[0].sections![0].content).toBe('');
      });

      it('does not delete any files', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when all standards are removed but recipes remain installed', () => {
      const removedStandards: StandardVersion[] = [
        {
          id: createStandardVersionId('standard-version-1'),
          standardId: createStandardId('standard-1'),
          name: 'Removed Standard',
          slug: 'removed-standard',
          description: 'Removed',
          version: 1,
          userId: createUserId('user-1'),
          scope: 'test',
        },
      ];

      const installedRecipes: RecipeVersion[] = [
        {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: createRecipeId('recipe-1'),
          name: 'Installed Recipe',
          slug: 'installed-recipe',
          content: '# Installed Recipe',
          version: 1,
          userId: createUserId('user-1'),
        },
      ];

      let result: FileUpdates;

      beforeEach(async () => {
        result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [],
            standardVersions: removedStandards,
            skillVersions: [],
          },
          {
            recipeVersions: installedRecipes,
            standardVersions: [],
            skillVersions: [],
          },
        );
      });

      it('generates one createOrUpdate entry to clear both sections', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('generates two sections in the createOrUpdate entry (recipes and standards)', () => {
        expect(result.createOrUpdate[0].sections).toHaveLength(2);
      });

      it('includes Packmind recipes section', () => {
        const recipesSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind recipes',
        );
        expect(recipesSection).toBeDefined();
      });

      it('sets Packmind recipes section content to empty', () => {
        const recipesSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind recipes',
        );
        expect(recipesSection!.content).toBe('');
      });

      it('includes Packmind standards section', () => {
        const standardsSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind standards',
        );
        expect(standardsSection).toBeDefined();
      });

      it('sets Packmind standards section content to empty', () => {
        const standardsSection = result.createOrUpdate[0].sections!.find(
          (s) => s.key === 'Packmind standards',
        );
        expect(standardsSection!.content).toBe('');
      });

      it('does not delete the file', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when no artifacts are removed', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
        );
      });

      it('returns one createOrUpdate entry', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('includes one section in the file update', () => {
        expect(result.createOrUpdate[0].sections).toHaveLength(1);
      });

      it('sets section key to Packmind recipes', () => {
        expect(result.createOrUpdate[0].sections![0].key).toBe(
          'Packmind recipes',
        );
      });

      it('sets section content to empty string', () => {
        expect(result.createOrUpdate[0].sections![0].content).toBe('');
      });

      it('does not generate delete entries', () => {
        expect(result.delete).toHaveLength(0);
      });
    });
  });
});
