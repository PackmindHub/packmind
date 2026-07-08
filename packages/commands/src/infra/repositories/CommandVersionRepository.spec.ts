import {
  createTestDatasourceFixture,
  itHandlesSoftDelete,
  stubLogger,
} from '@packmind/test-utils';
import { CommandVersionRepository } from './CommandVersionRepository';
import { CommandVersionSchema } from '../schemas/CommandVersionSchema';
import { CommandSchema } from '../schemas/CommandSchema';
import { commandFactory } from '../../../test/commandFactory';
import { commandVersionFactory } from '../../../test/commandVersionFactory';
import { CommandRepository } from './CommandRepository';
import {
  createCommandId,
  createSpaceId,
  Command,
  CommandVersion,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import { createGitCommit, gitCommitFactory } from '@packmind/git/test';
import { GitCommitSchema } from '@packmind/git';

describe('RecipeVersionRepository', () => {
  const fixture = createTestDatasourceFixture([
    CommandSchema,
    CommandVersionSchema,
    GitCommitSchema,
  ]);

  let commandVersionRepository: CommandVersionRepository;
  let commandRepository: CommandRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let testCommand: Command;

  beforeAll(() => fixture.initialize());

  beforeEach(async () => {
    stubbedLogger = stubLogger();

    commandVersionRepository = new CommandVersionRepository(
      fixture.datasource.getRepository(CommandVersionSchema),
      stubbedLogger,
    );

    commandRepository = new CommandRepository(
      fixture.datasource.getRepository(CommandSchema),
      stubbedLogger,
    );

    // Create a test recipe for soft delete tests
    testCommand = commandFactory();
    await commandRepository.add(testCommand);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  itHandlesSoftDelete<CommandVersion>({
    entityFactory: () => commandVersionFactory({ recipeId: testCommand.id }),
    getRepository: () => commandVersionRepository,
    queryDeletedEntity: async (id) =>
      fixture.datasource.getRepository(CommandVersionSchema).findOne({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { id: id as any },
        withDeleted: true,
      }),
  });

  it('stores and retrieves recipe versions', async () => {
    const recipe = commandFactory();
    await commandRepository.add(recipe);

    const recipeVersion = commandVersionFactory({ recipeId: recipe.id });
    await commandVersionRepository.add(recipeVersion);

    expect(await commandVersionRepository.list()).toStrictEqual([
      { ...recipeVersion, gitCommit: null },
    ]);
  });

  it('stores and retrieves multiple recipe versions', async () => {
    const command1 = commandFactory();
    const command2 = commandFactory();
    const command3 = commandFactory();

    await commandRepository.add(command1);
    await commandRepository.add(command2);
    await commandRepository.add(command3);

    await commandVersionRepository.add(
      commandVersionFactory({ recipeId: command1.id }),
    );
    await commandVersionRepository.add(
      commandVersionFactory({ recipeId: command2.id }),
    );
    await commandVersionRepository.add(
      commandVersionFactory({ recipeId: command3.id }),
    );

    expect(await commandVersionRepository.list()).toHaveLength(3);
  });

  it('finds recipe versions by recipeId', async () => {
    const recipe = commandFactory();
    await commandRepository.add(recipe);

    const commandVersion1 = commandVersionFactory({
      recipeId: recipe.id,
      version: 1,
    });
    const commandVersion2 = commandVersionFactory({
      recipeId: recipe.id,
      version: 2,
    });
    const commandVersion3 = commandVersionFactory({
      recipeId: recipe.id,
      version: 3,
    });

    await commandVersionRepository.add(commandVersion1);
    await commandVersionRepository.add(commandVersion2);
    await commandVersionRepository.add(commandVersion3);

    const anotherCommand = commandFactory();
    await commandRepository.add(anotherCommand);
    await commandVersionRepository.add(
      commandVersionFactory({ recipeId: anotherCommand.id }),
    );

    const versions = await commandVersionRepository.findByCommandId(recipe.id);

    expect(versions).toEqual(
      [commandVersion3, commandVersion2, commandVersion1].map((v) => ({
        ...v,
        gitCommit: null,
      })),
    );
  });

  it('finds the latest recipe version by recipeId', async () => {
    const recipe = commandFactory();
    await commandRepository.add(recipe);

    const commandVersion1 = commandVersionFactory({
      recipeId: recipe.id,
      version: 1,
    });
    const commandVersion2 = commandVersionFactory({
      recipeId: recipe.id,
      version: 2,
    });
    const commandVersion3 = commandVersionFactory({
      recipeId: recipe.id,
      version: 3,
    });

    await commandVersionRepository.add(commandVersion1);
    await commandVersionRepository.add(commandVersion2);
    await commandVersionRepository.add(commandVersion3);

    const latestVersion = await commandVersionRepository.findLatestByCommandId(
      recipe.id,
    );
    expect(latestVersion).toEqual({ ...commandVersion3, gitCommit: null });
  });

  describe('when recipe does not exist', () => {
    it('returns null for latest version', async () => {
      const latestVersion =
        await commandVersionRepository.findLatestByCommandId(
          createCommandId(uuidv4()),
        );
      expect(latestVersion).toBeNull();
    });

    it('returns null for findByRecipeIdAndVersion', async () => {
      const foundVersion =
        await commandVersionRepository.findByCommandIdAndVersion(
          createCommandId(uuidv4()),
          1,
          [createSpaceId(uuidv4())],
        );
      expect(foundVersion).toBeNull();
    });
  });

  it('finds a specific recipe version by recipeId and version', async () => {
    const recipe = commandFactory();
    await commandRepository.add(recipe);

    const commandVersion1 = commandVersionFactory({
      recipeId: recipe.id,
      version: 1,
    });
    const commandVersion2 = commandVersionFactory({
      recipeId: recipe.id,
      version: 2,
    });
    const commandVersion3 = commandVersionFactory({
      recipeId: recipe.id,
      version: 3,
    });

    await commandVersionRepository.add(commandVersion1);
    await commandVersionRepository.add(commandVersion2);
    await commandVersionRepository.add(commandVersion3);

    const foundVersion =
      await commandVersionRepository.findByCommandIdAndVersion(recipe.id, 2, [
        recipe.spaceId,
      ]);
    expect(foundVersion).toEqual(commandVersion2);
  });

  describe('when version does not exist', () => {
    it('returns null for non-existent version of existing recipe', async () => {
      const recipe = commandFactory();
      await commandRepository.add(recipe);

      const commandVersion1 = commandVersionFactory({
        recipeId: recipe.id,
        version: 1,
      });

      await commandVersionRepository.add(commandVersion1);

      const foundVersion =
        await commandVersionRepository.findByCommandIdAndVersion(recipe.id, 5, [
          recipe.spaceId,
        ]);
      expect(foundVersion).toBeNull();
    });
  });

  describe('when allowedSpaceIds is empty', () => {
    it('returns null even if matching data exists', async () => {
      const recipe = commandFactory();
      await commandRepository.add(recipe);

      await commandVersionRepository.add(
        commandVersionFactory({ recipeId: recipe.id, version: 1 }),
      );

      const foundVersion =
        await commandVersionRepository.findByCommandIdAndVersion(
          recipe.id,
          1,
          [],
        );
      expect(foundVersion).toBeNull();
    });
  });

  describe('GitCommit embedding', () => {
    describe('when gitCommit is available', () => {
      let recipe: Command;
      let savedGitCommit: ReturnType<typeof gitCommitFactory>;
      let versions: CommandVersion[];

      beforeEach(async () => {
        recipe = commandFactory();
        await commandRepository.add(recipe);

        const gitCommitData = gitCommitFactory();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...gitCommitWithoutId } = gitCommitData;
        savedGitCommit = await createGitCommit(
          fixture.datasource,
          gitCommitWithoutId,
        );

        const recipeVersion = commandVersionFactory({
          recipeId: recipe.id,
          gitCommit: savedGitCommit,
        });
        await commandVersionRepository.add(recipeVersion);

        versions = await commandVersionRepository.findByCommandId(recipe.id);
      });

      it('returns one version', async () => {
        expect(versions).toHaveLength(1);
      });

      it('embeds the gitCommit', async () => {
        expect(versions[0].gitCommit).toEqual(savedGitCommit);
      });
    });

    describe('when gitCommit is not available', () => {
      let recipe: Command;
      let versions: CommandVersion[];

      beforeEach(async () => {
        recipe = commandFactory();
        await commandRepository.add(recipe);

        const recipeVersion = commandVersionFactory({
          recipeId: recipe.id,
          gitCommit: undefined,
        });
        await commandVersionRepository.add(recipeVersion);

        versions = await commandVersionRepository.findByCommandId(recipe.id);
      });

      it('returns one version', async () => {
        expect(versions).toHaveLength(1);
      });

      it('returns null gitCommit', async () => {
        expect(versions[0].gitCommit).toBeNull();
      });
    });

    describe('when multiple versions have different gitCommits', () => {
      let recipe: Command;
      let savedGitCommit1: ReturnType<typeof gitCommitFactory>;
      let savedGitCommit2: ReturnType<typeof gitCommitFactory>;
      let versions: CommandVersion[];

      beforeEach(async () => {
        recipe = commandFactory();
        await commandRepository.add(recipe);

        const gitCommitData1 = gitCommitFactory();
        const gitCommitData2 = gitCommitFactory();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: id1, ...gitCommitWithoutId1 } = gitCommitData1;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: id2, ...gitCommitWithoutId2 } = gitCommitData2;
        savedGitCommit1 = await createGitCommit(
          fixture.datasource,
          gitCommitWithoutId1,
        );
        savedGitCommit2 = await createGitCommit(
          fixture.datasource,
          gitCommitWithoutId2,
        );

        const commandVersion1 = commandVersionFactory({
          recipeId: recipe.id,
          version: 1,
          gitCommit: savedGitCommit1,
        });
        const commandVersion2 = commandVersionFactory({
          recipeId: recipe.id,
          version: 2,
          gitCommit: savedGitCommit2,
        });
        const commandVersion3 = commandVersionFactory({
          recipeId: recipe.id,
          version: 3,
          gitCommit: undefined,
        });

        await commandVersionRepository.add(commandVersion1);
        await commandVersionRepository.add(commandVersion2);
        await commandVersionRepository.add(commandVersion3);

        versions = await commandVersionRepository.findByCommandId(recipe.id);
      });

      it('returns all three versions', async () => {
        expect(versions).toHaveLength(3);
      });

      it('returns null gitCommit for version 3', async () => {
        const version3 = versions.find((v) => v.version === 3);
        expect(version3?.gitCommit).toBeNull();
      });

      it('embeds gitCommit2 for version 2', async () => {
        const version2 = versions.find((v) => v.version === 2);
        expect(version2?.gitCommit).toEqual(savedGitCommit2);
      });

      it('embeds gitCommit1 for version 1', async () => {
        const version1 = versions.find((v) => v.version === 1);
        expect(version1?.gitCommit).toEqual(savedGitCommit1);
      });
    });
  });
});
