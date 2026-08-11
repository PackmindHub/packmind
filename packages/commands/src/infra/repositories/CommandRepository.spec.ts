import { GitCommitSchema } from '@packmind/git';
import { PackmindLogger } from '@packmind/logger';
import { SpaceSchema } from '@packmind/spaces';
import { spaceFactory } from '@packmind/spaces/test';
import {
  createTestDatasourceFixture,
  itHandlesSoftDelete,
  stubLogger,
} from '@packmind/test-utils';
import {
  createOrganizationId,
  createCommandId,
  createSpaceId,
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
  const fixture = createTestDatasourceFixture([
    CommandSchema,
    CommandVersionSchema,
    GitCommitSchema,
    SpaceSchema,
  ]);

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
