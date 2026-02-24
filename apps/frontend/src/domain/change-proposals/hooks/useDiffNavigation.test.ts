import { renderHook, act } from '@testing-library/react';
import { createChangeProposalId } from '@packmind/types';
import { groupByProximity, useDiffNavigation } from './useDiffNavigation';

describe('groupByProximity', () => {
  describe('with an empty list', () => {
    it('returns an empty array', () => {
      const result = groupByProximity([]);

      expect(result).toEqual([]);
    });
  });

  describe('with a single element', () => {
    it('returns one group containing the element', () => {
      const parent = document.createElement('div');
      const el = document.createElement('ins');
      parent.appendChild(el);

      const result = groupByProximity([el]);

      expect(result).toEqual([[el]]);
    });
  });

  describe('when two diff elements are direct siblings', () => {
    it('groups them together', () => {
      const parent = document.createElement('div');
      const del = document.createElement('del');
      const ins = document.createElement('ins');
      parent.appendChild(del);
      parent.appendChild(ins);

      const result = groupByProximity([del, ins]);

      expect(result).toEqual([[del, ins]]);
    });
  });

  describe('when two diff elements are separated by a text node', () => {
    it('creates separate groups', () => {
      const parent = document.createElement('div');
      const del = document.createElement('del');
      const text = document.createTextNode(' some text ');
      const ins = document.createElement('ins');
      parent.appendChild(del);
      parent.appendChild(text);
      parent.appendChild(ins);

      const result = groupByProximity([del, ins]);

      expect(result).toEqual([[del], [ins]]);
    });
  });

  describe('when two diff elements are separated by a non-diff element', () => {
    it('creates separate groups', () => {
      const parent = document.createElement('div');
      const del = document.createElement('del');
      const span = document.createElement('span');
      const ins = document.createElement('ins');
      parent.appendChild(del);
      parent.appendChild(span);
      parent.appendChild(ins);

      const result = groupByProximity([del, ins]);

      expect(result).toEqual([[del], [ins]]);
    });
  });

  describe('when multiple diff elements are consecutive siblings', () => {
    it('groups all into one group', () => {
      const parent = document.createElement('div');
      const del1 = document.createElement('del');
      const ins1 = document.createElement('ins');
      const del2 = document.createElement('del');
      const ins2 = document.createElement('ins');
      parent.appendChild(del1);
      parent.appendChild(ins1);
      parent.appendChild(del2);
      parent.appendChild(ins2);

      const result = groupByProximity([del1, ins1, del2, ins2]);

      expect(result).toEqual([[del1, ins1, del2, ins2]]);
    });
  });

  describe('when elements have different parents', () => {
    it('creates a separate group per parent', () => {
      const parent1 = document.createElement('div');
      const parent2 = document.createElement('div');
      const del = document.createElement('del');
      const ins = document.createElement('ins');
      parent1.appendChild(del);
      parent2.appendChild(ins);

      const result = groupByProximity([del, ins]);

      expect(result).toEqual([[del], [ins]]);
    });
  });
});

describe('useDiffNavigation', () => {
  let mutationCallbacks: MutationCallback[];
  const OriginalMutationObserver = window.MutationObserver;

  beforeEach(() => {
    mutationCallbacks = [];
    window.MutationObserver = class MockMutationObserver {
      private callback: MutationCallback;
      constructor(callback: MutationCallback) {
        this.callback = callback;
        mutationCallbacks.push(callback);
      }
      observe() {
        // no-op mock
      }
      disconnect() {
        // no-op mock
      }
      takeRecords() {
        return [];
      }
    } as unknown as typeof MutationObserver;
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    (window.requestAnimationFrame as jest.Mock).mockRestore();
    window.MutationObserver = OriginalMutationObserver;
    document.body.innerHTML = '';
  });

  describe('when no diff sections exist initially', () => {
    it('sets up a MutationObserver fallback on document.body', () => {
      const proposalId = createChangeProposalId('proposal-1');

      renderHook(() => useDiffNavigation(proposalId));

      expect(mutationCallbacks).toHaveLength(1);
    });

    it('detects changes once sections appear in the DOM', () => {
      const proposalId = createChangeProposalId('proposal-1');

      const { result } = renderHook(() => useDiffNavigation(proposalId));

      const section = document.createElement('div');
      section.setAttribute('data-diff-section', '');
      const change = document.createElement('div');
      change.setAttribute('data-diff-change', '');
      section.appendChild(change);
      document.body.appendChild(section);

      act(() => {
        mutationCallbacks[0]([], {} as MutationObserver);
      });

      expect(result.current.totalChanges).toBe(1);
    });
  });
});
