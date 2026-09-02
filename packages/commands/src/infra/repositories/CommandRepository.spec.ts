import { GitCommitSchema } from '@packmind/git';
import { PackmindLogger } from '@packmind/logger';
import { SpaceSchema } from '@packmind/spaces';
import { spaceFactory } from '@packmind/spaces/test';
import {
  createTestDatasourceFixture,
  itHandlesSoftDelete,
  stubLogger,
  TestUserSchema,
} from '@packmind/test-utils';
import {
  createOrganizationId,
  createCommandId,
  createSpaceId,
  createUserId,
  Command,
  WithSoftDelete,
} from '@packmind/types';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { commandFactory } from '../../../test/commandFactory';
import { ICommandRepository } from '../../domain/repositories/ICommandRepository';
import { CommandSchema } from '../schemas/CommandSchema';
import { CommandVersionSchema } from '../schemas/CommandVersionSchema';
import { CommandRepository } from './CommandRepository';

describe('RecipeRepository', () => {
  const fixture = createTestDatasourceFixture(
    [
      CommandSchema,
      CommandVersionSchema,
      GitCommitSchema,
      SpaceSchema,
      TestUserSchema,
    ],
    { recordQueries: true },
  );

  let commandRepository: ICommandRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let typeormRepo: Repository<Command>;

  beforeAll(() => fixture.initialize());

  beforeEach(() => {
    stubbedLogger = stubLogger();
    typeormRepo = fixture.datasource.getRepository(CommandSchema);

    commandRepository = new CommandRepository(typeormRepo, stubbedLogger);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  it('can find a recipe by id', async () => {
    const recipe = commandFactory();
    await commandRepository.add(recipe);

    const foundCommand = await commandRepository.findById(recipe.id);
    expect(foundCommand).toEqual(recipe);
  });

  describe('when finding a non-existent recipe', () => {
    it('returns null', async () => {
      const foundCommand = await commandRepository.findById(
        createCommandId(uuidv4()),
      );
      expect(foundCommand).toBeNull();
    });
  });

  describe('findBySlug', () => {
    let recipe: Command;

    beforeEach(async () => {
      recipe = await commandRepository.add(commandFactory());
    });

    it('can find a recipe by slug and organization', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const space = spaceFactory({ organizationId, id: recipe.spaceId });
      const spaceRepo = fixture.datasource.getRepository(SpaceSchema);
      await spaceRepo.save(space);

      expect(
        await commandRepository.findBySlug(recipe.slug, organizationId),
      ).toEqual(recipe);
    });

    describe('when recipe has been deleted', () => {
      beforeEach(async () => {
        await commandRepository.deleteById(recipe.id);
      });

      it('cannot find a deleted recipe by slug', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const space = spaceFactory({ organizationId, id: recipe.spaceId });
        const spaceRepo = fixture.datasource.getRepository(SpaceSchema);
        await spaceRepo.save(space);

        expect(
          await commandRepository.findBySlug(recipe.slug, organizationId),
        ).toBeNull();
      });

      it('can find a deleted recipe by slug if the includeDeleted flag is false', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const space = spaceFactory({ organizationId, id: recipe.spaceId });
        const spaceRepo = fixture.datasource.getRepository(SpaceSchema);
        await spaceRepo.save(space);

        expect(
          await commandRepository.findBySlug(recipe.slug, organizationId, {
            includeDeleted: false,
          }),
        ).toBeNull();
      });

      it('can find a deleted recipe by slug if the proper flag is provided', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const space = spaceFactory({ organizationId, id: recipe.spaceId });
        const spaceRepo = fixture.datasource.getRepository(SpaceSchema);
        await spaceRepo.save(space);

        expect(
          await commandRepository.findBySlug(recipe.slug, organizationId, {
            includeDeleted: true,
          }),
        ).toMatchObject({ id: recipe.id, name: recipe.name });
      });
    });
  });

  describe('countBySpaceIds', () => {
    describe('when counting commands per space', () => {
      let counts: Awaited<ReturnType<typeof commandRepository.countBySpaceIds>>;
      let spaceAId: ReturnType<typeof spaceFactory>['id'];
      let spaceBId: ReturnType<typeof spaceFactory>['id'];
      let spaceCId: ReturnType<typeof spaceFactory>['id'];

      beforeEach(async () => {
        const organizationId = createOrganizationId(uuidv4());
        const spaceA = spaceFactory({ organizationId, slug: 'space-a' });
        const spaceB = spaceFactory({ organizationId, slug: 'space-b' });
        const spaceC = spaceFactory({ organizationId, slug: 'space-c' });
        const spaceRepo = fixture.datasource.getRepository(SpaceSchema);
        await spaceRepo.save([spaceA, spaceB, spaceC]);

        await commandRepository.add(commandFactory({ spaceId: spaceA.id }));
        await commandRepository.add(commandFactory({ spaceId: spaceA.id }));
        await commandRepository.add(commandFactory({ spaceId: spaceB.id }));

        spaceAId = spaceA.id;
        spaceBId = spaceB.id;
        spaceCId = spaceC.id;

        counts = await commandRepository.countBySpaceIds([
          spaceA.id,
          spaceB.id,
          spaceC.id,
        ]);
      });

      it('returns the correct count for spaceA', () => {
        expect(counts.get(spaceAId)).toBe(2);
      });

      it('returns the correct count for spaceB', () => {
        expect(counts.get(spaceBId)).toBe(1);
      });

      it('omits spaceC which has zero commands', () => {
        expect(counts.has(spaceCId)).toBe(false);
      });
    });

    it('returns an empty Map for empty input', async () => {
      const counts = await commandRepository.countBySpaceIds([]);
      expect(counts.size).toBe(0);
    });

    it('excludes soft-deleted commands from the count', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const space = spaceFactory({ organizationId });
      const spaceRepo = fixture.datasource.getRepository(SpaceSchema);
      await spaceRepo.save(space);

      await commandRepository.add(commandFactory({ spaceId: space.id }));
      const deletedCommand = await commandRepository.add(
        commandFactory({ spaceId: space.id }),
      );
      await commandRepository.deleteById(deletedCommand.id);

      const counts = await commandRepository.countBySpaceIds([space.id]);

      expect(counts.get(space.id)).toBe(1);
    });

    it('omits unknown space IDs from the result Map', async () => {
      const unknownSpaceId = createSpaceId(uuidv4());

      const counts = await commandRepository.countBySpaceIds([unknownSpaceId]);

      expect(counts.has(unknownSpaceId)).toBe(false);
    });
  });

  describe('findBySpaceId', () => {
    describe('when the space holds 40 recipes written by 2 authors', () => {
      const spaceId = createSpaceId(uuidv4());
      const authorIds = [createUserId(uuidv4()), createUserId(uuidv4())];
      let foundCommands: Command[];

      beforeEach(async () => {
        await fixture.datasource.getRepository(TestUserSchema).save(
          authorIds.map((userId, index) => ({
            id: userId,
            email: `author-${index}@packmind.com`,
            displayName: `Author ${index}`,
          })),
        );

        // Seeded in bulk rather than one round trip per row: 40 sequential
        // inserts dominated this file's runtime.
        await commandRepository.addMany(
          Array.from({ length: 40 }, (_, index) =>
            commandFactory({
              spaceId,
              userId: authorIds[index % authorIds.length],
            }),
          ),
        );

        fixture.queries.reset();
        foundCommands = await commandRepository.findBySpaceId(spaceId);
      });

      it('returns every recipe of the space', () => {
        expect(foundCommands).toHaveLength(40);
      });

      it('resolves the authors with a single user query', () => {
        expect(fixture.queries.countMatching(/from "users"/i)).toBe(1);
      });

      it('resolves the author of every recipe', () => {
        expect(
          foundCommands.map((command) => command.createdBy?.displayName),
        ).toEqual(
          foundCommands.map(
            (command) => `Author ${authorIds.indexOf(command.userId)}`,
          ),
        );
      });
    });

    describe('when an author cannot be resolved', () => {
      const spaceId = createSpaceId(uuidv4());
      const knownAuthorId = createUserId(uuidv4());
      const unknownAuthorId = createUserId(uuidv4());
      let foundCommands: Command[];

      beforeEach(async () => {
        await fixture.datasource.getRepository(TestUserSchema).save({
          id: knownAuthorId,
          email: 'alice@packmind.com',
          displayName: 'Alice',
        });
        await commandRepository.add(
          commandFactory({ spaceId, name: 'Known', userId: knownAuthorId }),
        );
        await commandRepository.add(
          commandFactory({ spaceId, name: 'Unknown', userId: unknownAuthorId }),
        );

        foundCommands = await commandRepository.findBySpaceId(spaceId);
      });

      it('leaves that recipe without an author', () => {
        expect(
          foundCommands.find((command) => command.name === 'Unknown')
            ?.createdBy,
        ).toBeUndefined();
      });

      it('still resolves the other authors', () => {
        expect(
          foundCommands.find((command) => command.name === 'Known')?.createdBy,
        ).toEqual({ userId: knownAuthorId, displayName: 'Alice' });
      });
    });
  });

  itHandlesSoftDelete<Command>({
    entityFactory: commandFactory,
    getRepository: () => commandRepository,
    queryDeletedEntity: async (id) =>
      typeormRepo.findOne({
        where: { id },
        withDeleted: true,
      }) as unknown as WithSoftDelete<Command>,
  });
});
