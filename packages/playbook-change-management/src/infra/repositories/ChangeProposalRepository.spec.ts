import {
  createTestDatasourceFixture,
  itHandlesSoftDelete,
  stubLogger,
} from '@packmind/test-utils';
import { ChangeProposalRepository } from './ChangeProposalRepository';
import { ChangeProposalSchema } from '../schemas/ChangeProposalSchema';
import {
  ChangeProposal,
  ChangeProposalType,
  createSpaceId,
  createStandardId,
} from '@packmind/types';
import { changeProposalFactory } from '../../../test';

describe('ChangeProposalRepository', () => {
  const fixture = createTestDatasourceFixture([ChangeProposalSchema]);

  let repository: ChangeProposalRepository;

  const spaceAId = createSpaceId('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  const spaceBId = createSpaceId('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

  beforeAll(() => fixture.initialize());

  beforeEach(() => {
    repository = new ChangeProposalRepository(
      fixture.datasource.getRepository(ChangeProposalSchema),
      stubLogger(),
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  itHandlesSoftDelete<ChangeProposal<ChangeProposalType>>({
    entityFactory: () => changeProposalFactory({ spaceId: spaceAId }),
    getRepository: () => repository,
    queryDeletedEntity: async (id) =>
      fixture.datasource.getRepository(ChangeProposalSchema).findOne({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { id: id as any },
        withDeleted: true,
      }),
  });

  describe('save', () => {
    it('persists a change proposal', async () => {
      const proposal = changeProposalFactory({ spaceId: spaceAId });

      await repository.save(proposal);

      const found = await repository.findById(proposal.id);
      expect(found).toMatchObject({ id: proposal.id, type: proposal.type });
    });
  });

  describe('findByArtefactId', () => {
    const artefactId = createStandardId('cccccccc-cccc-cccc-cccc-cccccccccccc');

    describe('when proposals exist for the artefact', () => {
      let result: ChangeProposal<ChangeProposalType>[];

      beforeEach(async () => {
        const p1 = changeProposalFactory({
          spaceId: spaceAId,
          artefactId,
        });
        const p2 = changeProposalFactory({
          spaceId: spaceAId,
          artefactId,
        });
        await repository.save(p1);
        await repository.save(p2);

        result = await repository.findByArtefactId(artefactId);
      });

      it('returns all matching proposals', () => {
        expect(result).toHaveLength(2);
      });
    });

    describe('when no proposals exist for the artefact', () => {
      it('returns an empty array', async () => {
        const result = await repository.findByArtefactId(
          createStandardId('dddddddd-dddd-dddd-dddd-dddddddddddd'),
        );

        expect(result).toEqual([]);
      });
    });
  });

  describe('findBySpaceId', () => {
    describe('when proposals exist in the space', () => {
      let result: ChangeProposal<ChangeProposalType>[];

      beforeEach(async () => {
        await repository.save(changeProposalFactory({ spaceId: spaceAId }));
        await repository.save(changeProposalFactory({ spaceId: spaceAId }));
        await repository.save(changeProposalFactory({ spaceId: spaceBId }));

        result = await repository.findBySpaceId(spaceAId);
      });

      it('returns only proposals from the requested space', () => {
        expect(result).toHaveLength(2);
      });

      it('returns proposals with the correct space id', () => {
        expect(result.every((p) => p.spaceId === spaceAId)).toBe(true);
      });
    });

    describe('when no proposals exist in the space', () => {
      it('returns an empty array', async () => {
        await repository.save(changeProposalFactory({ spaceId: spaceBId }));

        const result = await repository.findBySpaceId(spaceAId);

        expect(result).toEqual([]);
      });
    });
  });

  describe('update', () => {
    it('persists updated fields', async () => {
      const proposal = changeProposalFactory({ spaceId: spaceAId });
      await repository.save(proposal);

      proposal.status =
        'applied' as ChangeProposal<ChangeProposalType>['status'];
      await repository.update(proposal);

      const found = await repository.findById(proposal.id);
      expect(found?.status).toEqual('applied');
    });
  });
});
