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
  let observeTargets: Node[];
  const OriginalMutationObserver = window.MutationObserver;

  beforeEach(() => {
    jest.useFakeTimers({
      doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame'],
    });
    mutationCallbacks = [];
    observeTargets = [];
    window.MutationObserver = class MockMutationObserver {
      private callback: MutationCallback;
      constructor(callback: MutationCallback) {
        this.callback = callback;
        mutationCallbacks.push(callback);
      }
      observe(target: Node) {
        observeTargets.push(target);
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
    jest.useRealTimers();
  });

  describe('when no diff sections exist initially', () => {
    it('observes document.body for mutations', () => {
      const proposalId = createChangeProposalId('proposal-1');

      renderHook(() => useDiffNavigation(proposalId));

      expect(observeTargets).toContain(document.body);
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
        jest.runAllTimers();
      });

      expect(result.current.totalChanges).toBe(1);
    });
  });

  describe('when diff sections already exist in DOM', () => {
    it('detects changes on the first frame scan', () => {
      const section = document.createElement('div');
      section.setAttribute('data-diff-section', '');
      const change = document.createElement('ins');
      section.appendChild(change);
      document.body.appendChild(section);

      const proposalId = createChangeProposalId('proposal-1');

      const { result } = renderHook(() => useDiffNavigation(proposalId));

      act(() => {
        jest.runAllTimers();
      });

      expect(result.current.totalChanges).toBe(1);
    });
  });

  describe('when switching from one proposal to another', () => {
    it('re-detects changes for the new proposal', () => {
      const section = document.createElement('div');
      section.setAttribute('data-diff-section', '');
      const change1 = document.createElement('ins');
      const change2 = document.createElement('del');
      section.appendChild(change1);
      section.appendChild(change2);
      document.body.appendChild(section);

      const proposalId1 = createChangeProposalId('proposal-1');
      const proposalId2 = createChangeProposalId('proposal-2');

      const { result, rerender } = renderHook(
        ({ id }) => useDiffNavigation(id),
        { initialProps: { id: proposalId1 } },
      );

      // Replace DOM content for the new proposal
      section.innerHTML = '';
      const newChange = document.createElement('div');
      newChange.setAttribute('data-diff-change', '');
      section.appendChild(newChange);

      rerender({ id: proposalId2 });

      act(() => {
        jest.runAllTimers();
      });

      expect(result.current.totalChanges).toBe(1);
    });
  });

  describe('when switching proposals with same change count', () => {
    it('removes data-diff-active from old element', () => {
      const section = document.createElement('div');
      section.setAttribute('data-diff-section', '');
      const change1 = document.createElement('ins');
      section.appendChild(change1);
      document.body.appendChild(section);

      const proposalId1 = createChangeProposalId('proposal-1');
      const proposalId2 = createChangeProposalId('proposal-2');

      const { rerender } = renderHook(({ id }) => useDiffNavigation(id), {
        initialProps: { id: proposalId1 },
      });

      act(() => {
        jest.runAllTimers();
      });

      // Replace with a different element for the second proposal
      section.innerHTML = '';
      const change2 = document.createElement('del');
      section.appendChild(change2);

      rerender({ id: proposalId2 });

      act(() => {
        jest.runAllTimers();
      });

      expect(change1.hasAttribute('data-diff-active')).toBe(false);
    });

    it('applies data-diff-active on the new element', () => {
      const section = document.createElement('div');
      section.setAttribute('data-diff-section', '');
      const change1 = document.createElement('ins');
      section.appendChild(change1);
      document.body.appendChild(section);

      const proposalId1 = createChangeProposalId('proposal-1');
      const proposalId2 = createChangeProposalId('proposal-2');

      const { rerender } = renderHook(({ id }) => useDiffNavigation(id), {
        initialProps: { id: proposalId1 },
      });

      // Replace with a different element for the second proposal
      section.innerHTML = '';
      const change2 = document.createElement('del');
      section.appendChild(change2);

      rerender({ id: proposalId2 });

      act(() => {
        jest.runAllTimers();
      });

      expect(change2.hasAttribute('data-diff-active')).toBe(true);
    });
  });
});
