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
