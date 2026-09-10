import { ChangeProposalStatus } from '@packmind/types';
import {
  REVIEW_ARTEFACT_TYPES,
  componentUpdatedAt,
  pendingProposalCount,
  pendingReviewsByComponent,
  reviewChangesLabel,
} from './componentMaintenance';

const UPDATED = '2026-09-01T10:00:00.000Z';

describe('componentUpdatedAt', () => {
  describe('when the entity carries a date', () => {
    it('reads it off a string', () => {
      expect(componentUpdatedAt({ updatedAt: UPDATED })).toBe(UPDATED);
    });

    it('reads it off a Date', () => {
      expect(componentUpdatedAt({ updatedAt: new Date(UPDATED) })).toBe(
        UPDATED,
      );
    });
  });

  /*
   * The case the header must survive rather than paper over: a command's type
   * does not declare `updatedAt` at all, so an entity without one is ordinary
   * and not a failure.
   */
  describe('when the entity carries no date', () => {
    it('reports nothing rather than inventing one', () => {
      expect(componentUpdatedAt({})).toBeNull();
    });

    it('reports nothing for a null date', () => {
      expect(componentUpdatedAt({ updatedAt: null })).toBeNull();
    });
  });

  describe('when there is no entity yet', () => {
    it('reports nothing while the query is in flight', () => {
      expect(componentUpdatedAt(undefined)).toBeNull();
    });
  });

  describe('when the date cannot be read', () => {
    it('reports nothing', () => {
      expect(componentUpdatedAt({ updatedAt: 'not a date' })).toBeNull();
    });
  });
});

describe('pendingProposalCount', () => {
  describe('when proposals are waiting', () => {
    it('counts them', () => {
      expect(
        pendingProposalCount({
          changeProposals: [
            { status: ChangeProposalStatus.pending },
            { status: ChangeProposalStatus.pending },
          ],
        }),
      ).toBe(2);
    });
  });

  /*
   * A component with a year of accepted proposals is a well maintained one, not
   * one with a year of things to read.
   */
  describe('when proposals have been decided', () => {
    it('leaves the applied ones out', () => {
      expect(
        pendingProposalCount({
          changeProposals: [
            { status: ChangeProposalStatus.applied },
            { status: ChangeProposalStatus.pending },
          ],
        }),
      ).toBe(1);
    });

    it('leaves the rejected ones out', () => {
      expect(
        pendingProposalCount({
          changeProposals: [{ status: ChangeProposalStatus.rejected }],
        }),
      ).toBe(0);
    });
  });

  /* What the OSS stub answers, where proposals do not exist. */
  describe('when there is no payload', () => {
    it('counts nothing', () => {
      expect(pendingProposalCount(undefined)).toBe(0);
    });

    it('counts nothing for an envelope with no list', () => {
      expect(pendingProposalCount({})).toBe(0);
    });
  });
});

describe('pendingReviewsByComponent', () => {
  describe('when components of each type are waiting', () => {
    const counts = pendingReviewsByComponent({
      standards: [{ artefactId: 'std-1', changeProposalCount: 2 }],
      commands: [{ artefactId: 'cmd-1', changeProposalCount: 1 }],
      skills: [{ artefactId: 'skl-1', changeProposalCount: 5 }],
    });

    it('keys a standard by its type and id', () => {
      expect(counts.get('standard:std-1')).toBe(2);
    });

    it('keys a command by its type and id', () => {
      expect(counts.get('command:cmd-1')).toBe(1);
    });

    it('keys a skill by its type and id', () => {
      expect(counts.get('skill:skl-1')).toBe(5);
    });
  });

  /*
   * The reason the key is not the artefact id alone. Two entities of different
   * types can carry the same one, and a lookup on the id would mark a standard
   * because a command has a proposal open.
   */
  describe('when two types share an id', () => {
    const counts = pendingReviewsByComponent({
      standards: [{ artefactId: 'shared', changeProposalCount: 2 }],
      commands: [{ artefactId: 'shared', changeProposalCount: 7 }],
    });

    it('tells the standard from the command', () => {
      expect(counts.get('standard:shared')).toBe(2);
    });

    it('does not let one type answer for the other', () => {
      expect(counts.get('command:shared')).toBe(7);
    });
  });

  describe('when a component has nothing waiting', () => {
    const counts = pendingReviewsByComponent({
      standards: [{ artefactId: 'std-1', changeProposalCount: 0 }],
    });

    it('leaves it out rather than keying it to zero', () => {
      expect(counts.has('standard:std-1')).toBe(false);
    });
  });

  /*
   * A proposal to create a component names no artefact, so it cannot mark a row
   * in a list of components that exist.
   */
  describe('when the space has creations pending', () => {
    const counts = pendingReviewsByComponent({
      standards: [],
      commands: [],
      skills: [],
    });

    it('marks nothing', () => {
      expect(counts.size).toBe(0);
    });
  });

  /* What the OSS stub answers, where proposals do not exist. */
  describe('when there is no payload', () => {
    it('marks nothing', () => {
      expect(pendingReviewsByComponent(undefined).size).toBe(0);
    });

    it('marks nothing for an envelope with no lists', () => {
      expect(pendingReviewsByComponent({}).size).toBe(0);
    });
  });
});

describe('reviewChangesLabel', () => {
  describe('when one change is waiting', () => {
    it('speaks of it in the singular', () => {
      expect(reviewChangesLabel(1)).toBe('1 change to review');
    });
  });

  describe('when several are waiting', () => {
    it('speaks of them in the plural', () => {
      expect(reviewChangesLabel(3)).toBe('3 changes to review');
    });
  });
});

describe('REVIEW_ARTEFACT_TYPES', () => {
  it('addresses a standard by the segment the review routes use', () => {
    expect(REVIEW_ARTEFACT_TYPES.standard).toBe('standards');
  });

  it('addresses a command by the segment the review routes use', () => {
    expect(REVIEW_ARTEFACT_TYPES.command).toBe('commands');
  });

  it('addresses a skill by the segment the review routes use', () => {
    expect(REVIEW_ARTEFACT_TYPES.skill).toBe('skills');
  });
});
