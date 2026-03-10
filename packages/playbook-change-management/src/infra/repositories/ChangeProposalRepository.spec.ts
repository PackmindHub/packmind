import {
  createTestDatasourceFixture,
  itHandlesSoftDelete,
  stubLogger,
} from '@packmind/test-utils';
import { ChangeProposalRepository } from './ChangeProposalRepository';
import { ChangeProposalSchema } from '../schemas/ChangeProposalSchema';
import {
  ChangeProposal,
  ChangeProposalStatus,
  ChangeProposalType,
  createSpaceId,
  createStandardId,
  createUserId,
} from '@packmind/types';
import { changeProposalFactory } from '../../../test';

describe('ChangeProposalRepository', () => {
  const fixture = createTestDatasourceFixture([ChangeProposalSchema]);

  let repository: ChangeProposalRepository;

  const spaceAId = createSpaceId('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  const spaceBId = createSpaceId('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
  const createStandardPayload = {
    name: 'New Standard',
    description: 'A description',
    scope: null,
    rules: [],
  };

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

        result = await repository.findByArtefactId(spaceAId, artefactId);
      });

      it('returns all matching proposals', () => {
        expect(result).toHaveLength(2);
      });
    });

    describe('when no proposals exist for the artefact', () => {
      it('returns an empty array', async () => {
        const result = await repository.findByArtefactId(
          spaceAId,
          createStandardId('dddddddd-dddd-dddd-dddd-dddddddddddd'),
        );

        expect(result).toEqual([]);
      });
    });

    describe('when proposals exist in different spaces for the same artefact', () => {
      let result: ChangeProposal<ChangeProposalType>[];

      beforeEach(async () => {
        const p1 = changeProposalFactory({ spaceId: spaceAId, artefactId });
        const p2 = changeProposalFactory({ spaceId: spaceBId, artefactId });
        await repository.save(p1);
        await repository.save(p2);

        result = await repository.findByArtefactId(spaceAId, artefactId);
      });

      it('returns only one proposal', () => {
        expect(result).toHaveLength(1);
      });

      it('returns proposals from the requested space only', () => {
        expect(result[0].spaceId).toEqual(spaceAId);
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

  describe('findExistingPending', () => {
    const artefactId = createStandardId('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
    const createdBy = createUserId('ffffffff-ffff-ffff-ffff-ffffffffffff');
    const type = ChangeProposalType.updateStandardName;
    const payload = { oldValue: 'Old Name', newValue: 'New Name' };

    describe('when a pending proposal matching all criteria exists with a non-null artefactId', () => {
      let result: ChangeProposal<ChangeProposalType> | null;

      beforeEach(async () => {
        await repository.save(
          changeProposalFactory({
            spaceId: spaceAId,
            createdBy,
            artefactId,
            type,
            payload,
            status: ChangeProposalStatus.pending,
          }),
        );

        result = await repository.findExistingPending({
          spaceId: spaceAId,
          createdBy,
          artefactId,
          type,
          payload,
        });
      });

      it('returns the matching proposal', () => {
        expect(result).not.toBeNull();
      });
    });

    describe('when a pending proposal matching all criteria exists with a null artefactId', () => {
      let result: ChangeProposal<ChangeProposalType> | null;

      beforeEach(async () => {
        await repository.save(
          changeProposalFactory({
            spaceId: spaceAId,
            createdBy,
            artefactId: null,
            type: ChangeProposalType.createStandard,
            payload: createStandardPayload,
            status: ChangeProposalStatus.pending,
          }),
        );

        result = await repository.findExistingPending({
          spaceId: spaceAId,
          createdBy,
          artefactId: null,
          type: ChangeProposalType.createStandard,
          payload: createStandardPayload,
        });
      });

      it('returns the matching proposal', () => {
        expect(result).not.toBeNull();
      });
    });

    describe('when artefactId is null but only proposals with non-null artefactId exist', () => {
      it('returns null', async () => {
        await repository.save(
          changeProposalFactory({
            spaceId: spaceAId,
            createdBy,
            artefactId,
            type: ChangeProposalType.createStandard,
            payload: createStandardPayload,
            status: ChangeProposalStatus.pending,
          }),
        );

        const result = await repository.findExistingPending({
          spaceId: spaceAId,
          createdBy,
          artefactId: null,
          type: ChangeProposalType.createStandard,
          payload: createStandardPayload,
        });

        expect(result).toBeNull();
      });
    });

    describe('when artefactId is non-null but only proposals with null artefactId exist', () => {
      it('returns null', async () => {
        await repository.save(
          changeProposalFactory({
            spaceId: spaceAId,
            createdBy,
            artefactId: null,
            type: ChangeProposalType.createStandard,
            payload: createStandardPayload,
            status: ChangeProposalStatus.pending,
          }),
        );

        const result = await repository.findExistingPending({
          spaceId: spaceAId,
          createdBy,
          artefactId,
          type: ChangeProposalType.createStandard,
          payload: createStandardPayload,
        });

        expect(result).toBeNull();
      });
    });

    describe('when no pending proposal exists matching the criteria', () => {
      it('returns null', async () => {
        const result = await repository.findExistingPending({
          spaceId: spaceAId,
          createdBy,
          artefactId,
          type,
          payload,
        });

        expect(result).toBeNull();
      });
    });
  });

  describe('cancelPendingByArtefactId', () => {
    const artefactId = createStandardId('cccccccc-cccc-cccc-cccc-cccccccccccc');
    const otherArtefactId = createStandardId(
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
    );
    const cancelledBy = createUserId('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');

    describe('when pending proposals exist for the artefact', () => {
      let proposals: ChangeProposal<ChangeProposalType>[];

      beforeEach(async () => {
        await repository.save(
          changeProposalFactory({
            spaceId: spaceAId,
            artefactId,
            status: ChangeProposalStatus.pending,
          }),
        );
        await repository.save(
          changeProposalFactory({
            spaceId: spaceAId,
            artefactId,
            status: ChangeProposalStatus.pending,
          }),
        );
        await repository.save(
          changeProposalFactory({
            spaceId: spaceAId,
            artefactId: otherArtefactId,
            status: ChangeProposalStatus.pending,
          }),
        );

        await repository.cancelPendingByArtefactId(
          spaceAId,
          artefactId,
          cancelledBy,
        );

        proposals = await repository.findByArtefactId(spaceAId, artefactId);
      });

      it('cancels exactly the matching proposals', () => {
        expect(proposals).toHaveLength(2);
      });

      it('sets status to rejected for all matching proposals', () => {
        expect(proposals.map((p) => p.status)).toEqual([
          ChangeProposalStatus.rejected,
          ChangeProposalStatus.rejected,
        ]);
      });

      it('sets resolvedBy to the cancelling user for all matching proposals', () => {
        expect(proposals.map((p) => p.resolvedBy)).toEqual([
          cancelledBy,
          cancelledBy,
        ]);
      });

      it('sets resolvedAt to a Date for all matching proposals', () => {
        expect(proposals.map((p) => p.resolvedAt)).toEqual([
          expect.any(Date),
          expect.any(Date),
        ]);
      });

      it('sets decision to null for all matching proposals', () => {
        expect(proposals.map((p) => p.decision)).toEqual([null, null]);
      });

      it('does not affect pending proposals for other artefacts', async () => {
        const otherProposals = await repository.findByArtefactId(
          spaceAId,
          otherArtefactId,
        );

        expect(otherProposals[0].status).toBe(ChangeProposalStatus.pending);
      });
    });

    describe('when no proposals exist for the artefact', () => {
      it('resolves without throwing', async () => {
        await expect(
          repository.cancelPendingByArtefactId(
            spaceAId,
            createStandardId('nonexistent-id'),
            cancelledBy,
          ),
        ).resolves.not.toThrow();
      });
    });

    describe('when a pending proposal exists for the same artefact in a different space', () => {
      beforeEach(async () => {
        await repository.save(
          changeProposalFactory({
            spaceId: spaceBId,
            artefactId,
            status: ChangeProposalStatus.pending,
          }),
        );

        await repository.cancelPendingByArtefactId(
          spaceAId,
          artefactId,
          cancelledBy,
        );
      });

      it('does not affect proposals in other spaces', async () => {
        const proposals = await repository.findByArtefactId(
          spaceBId,
          artefactId,
        );

        expect(proposals[0].status).toBe(ChangeProposalStatus.pending);
      });
    });

    describe('when an already-applied proposal exists for the same artefact', () => {
      beforeEach(async () => {
        await repository.save(
          changeProposalFactory({
            spaceId: spaceAId,
            artefactId,
            status: ChangeProposalStatus.applied,
          }),
        );

        await repository.cancelPendingByArtefactId(
          spaceAId,
          artefactId,
          cancelledBy,
        );
      });

      it('does not affect already-applied proposals', async () => {
        const proposals = await repository.findByArtefactId(
          spaceAId,
          artefactId,
        );

        expect(proposals[0].status).toBe(ChangeProposalStatus.applied);
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
