import { useState, useEffect, useRef, useCallback } from 'react';
import { ChangeProposalId } from '@packmind/types';

const CHANGE_SELECTOR =
  '[data-diff-section] ins, [data-diff-section] del, [data-diff-section] [data-diff-change], [data-diff-section] .diff-ins, [data-diff-section] .diff-del';

function findScrollableAncestor(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement;
  while (parent) {
    const { overflowY, overflow } = window.getComputedStyle(parent);
    if (
      (overflowY === 'auto' ||
        overflowY === 'scroll' ||
        overflow === 'auto' ||
        overflow === 'scroll') &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

function scrollToElement(element: HTMLElement) {
  const container = findScrollableAncestor(element);
  if (!container) return;
  const targetRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const offset = targetRect.top - containerRect.top + container.scrollTop;
  const center = offset - container.clientHeight / 2 + targetRect.height / 2;
  container.scrollTo({ top: center, behavior: 'smooth' });
}

function areAdjacent(
  a: HTMLElement,
  b: HTMLElement,
  diffSet: Set<HTMLElement>,
): boolean {
  if (a.parentNode !== b.parentNode) return false;
  let node = a.nextSibling;
  while (node !== null && node !== b) {
    if (
      node.nodeType !== Node.ELEMENT_NODE ||
      !diffSet.has(node as HTMLElement)
    ) {
      return false;
    }
    node = node.nextSibling;
  }
  return node === b;
}

export function groupByProximity(elements: HTMLElement[]): HTMLElement[][] {
  if (elements.length === 0) return [];
  const diffSet = new Set(elements);
  const groups: HTMLElement[][] = [[elements[0]]];
  for (let i = 1; i < elements.length; i++) {
    if (areAdjacent(elements[i - 1], elements[i], diffSet)) {
      groups[groups.length - 1].push(elements[i]);
    } else {
      groups.push([elements[i]]);
    }
  }
  return groups;
}

function checkHasScroll(elements: HTMLElement[]): boolean {
  if (elements.length === 0) return false;
  return findScrollableAncestor(elements[0]) !== null;
}

export function useDiffNavigation(
  reviewingProposalId: ChangeProposalId | null,
) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalChanges, setTotalChanges] = useState(0);
  const [hasScroll, setHasScroll] = useState(false);
  const groupsRef = useRef<HTMLElement[][]>([]);

  useEffect(() => {
    if (!reviewingProposalId) {
      groupsRef.current
        .flat()
        .forEach((el) => el.removeAttribute('data-diff-active'));
      groupsRef.current = [];
      setCurrentIndex(0);
      setTotalChanges(0);
      setHasScroll(false);
      return;
    }

    let cancelled = false;

    function applyGroups(groups: HTMLElement[][]) {
      if (cancelled) return;
      groupsRef.current = groups;
      setTotalChanges(groups.length);
      setCurrentIndex(0);
      setHasScroll(checkHasScroll(groups.flat()));
    }

    let observer: MutationObserver | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const frameId = requestAnimationFrame(() => {
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>(CHANGE_SELECTOR),
      );

      if (elements.length > 0) {
        applyGroups(groupByProximity(elements));
        return;
      }

      // No elements yet — watch for them to appear
      const scanForChanges = () => {
        const els = Array.from(
          document.querySelectorAll<HTMLElement>(CHANGE_SELECTOR),
        );
        if (els.length > 0) {
          observer?.disconnect();
          if (timeoutId) clearTimeout(timeoutId);
          applyGroups(groupByProximity(els));
        }
      };

      observer = new MutationObserver(scanForChanges);

      const sections = document.querySelectorAll('[data-diff-section]');
      if (sections.length === 0) {
        // Sections not yet in DOM (e.g. added file not rendered yet)
        observer.observe(document.body, { childList: true, subtree: true });
      } else {
        // Sections exist but children not yet rendered (accordion hydration)
        sections.forEach((section) =>
          observer!.observe(section, { childList: true, subtree: true }),
        );
      }

      // Stop observing after 2s to avoid leaks
      timeoutId = setTimeout(() => observer?.disconnect(), 2000);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      observer?.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
      groupsRef.current
        .flat()
        .forEach((el) => el.removeAttribute('data-diff-active'));
    };
  }, [reviewingProposalId]);

  useEffect(() => {
    if (totalChanges === 0) return;

    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(CHANGE_SELECTOR),
    );
    const groups = groupByProximity(elements);
    groupsRef.current = groups;
    setHasScroll(checkHasScroll(elements));

    elements.forEach((el) => el.removeAttribute('data-diff-active'));

    const current = groups[currentIndex];
    if (!current) return;

    current.forEach((el) => el.setAttribute('data-diff-active', ''));
    scrollToElement(current[0]);
  }, [currentIndex, totalChanges]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev >= groupsRef.current.length - 1) return prev;
      return prev + 1;
    });
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev <= 0) return prev;
      return prev - 1;
    });
  }, []);

  const scrollToCurrent = useCallback(() => {
    const groups = groupsRef.current;
    const target = groups[currentIndex]?.[0];
    if (target) scrollToElement(target);
  }, [currentIndex]);

  return {
    currentIndex,
    totalChanges,
    hasScroll,
    goToNext,
    goToPrevious,
    scrollToCurrent,
  };
}
