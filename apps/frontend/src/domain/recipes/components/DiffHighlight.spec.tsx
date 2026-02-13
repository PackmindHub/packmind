import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { DiffHighlight } from './DiffHighlight';

const renderWithProviders = (component: React.ReactElement) => {
  return render(<UIProvider>{component}</UIProvider>);
};

describe.skip('DiffHighlight', () => {
  describe('when text has additions', () => {
    it('renders added text with green background', () => {
      const { container } = renderWithProviders(
        <DiffHighlight oldText="hello" newText="hello world" />,
      );

      const styledSpans = container.querySelectorAll('span[style]');
      const addedSpan = Array.from(styledSpans).find((span) =>
        span.getAttribute('style')?.includes('green-100'),
      );

      expect(addedSpan).toBeDefined();
    });

    it('renders added text with green color', () => {
      const { container } = renderWithProviders(
        <DiffHighlight oldText="hello" newText="hello world" />,
      );

      const styledSpans = container.querySelectorAll('span[style]');
      const addedSpan = Array.from(styledSpans).find((span) =>
        span.getAttribute('style')?.includes('green-100'),
      );

      expect(addedSpan?.getAttribute('style')).toContain('green-800');
    });
  });

  describe('when text has removals', () => {
    it('renders removed text with red background', () => {
      const { container } = renderWithProviders(
        <DiffHighlight oldText="hello world" newText="hello" />,
      );

      const styledSpans = container.querySelectorAll('span[style]');
      const removedSpan = Array.from(styledSpans).find((span) =>
        span.getAttribute('style')?.includes('red-100'),
      );

      expect(removedSpan).toBeDefined();
    });

    it('renders removed text with line-through decoration', () => {
      const { container } = renderWithProviders(
        <DiffHighlight oldText="hello world" newText="hello" />,
      );

      const styledSpans = container.querySelectorAll('span[style]');
      const removedSpan = Array.from(styledSpans).find((span) =>
        span.getAttribute('style')?.includes('red-100'),
      );

      expect(removedSpan?.getAttribute('style')).toContain('line-through');
    });
  });

  describe('when both strings are identical', () => {
    it('renders the text content', () => {
      const { container } = renderWithProviders(
        <DiffHighlight oldText="same text" newText="same text" />,
      );

      expect(container.textContent).toBe('same text');
    });

    it('does not render any styled spans', () => {
      const { container } = renderWithProviders(
        <DiffHighlight oldText="same text" newText="same text" />,
      );

      const styledSpans = container.querySelectorAll('span[style]');

      expect(styledSpans).toHaveLength(0);
    });
  });

  describe('when text has both additions and removals', () => {
    it('renders added text with green background', () => {
      const { container } = renderWithProviders(
        <DiffHighlight oldText="the cat sat" newText="the dog sat" />,
      );

      const styledSpans = container.querySelectorAll('span[style]');
      const addedSpan = Array.from(styledSpans).find(
        (span) =>
          span.getAttribute('style')?.includes('green-100') &&
          span.textContent?.includes('dog'),
      );

      expect(addedSpan).toBeDefined();
    });

    it('renders removed text with red background', () => {
      const { container } = renderWithProviders(
        <DiffHighlight oldText="the cat sat" newText="the dog sat" />,
      );

      const styledSpans = container.querySelectorAll('span[style]');
      const removedSpan = Array.from(styledSpans).find(
        (span) =>
          span.getAttribute('style')?.includes('red-100') &&
          span.textContent?.includes('cat'),
      );

      expect(removedSpan).toBeDefined();
    });

    it('preserves unchanged text in the output', () => {
      const { container } = renderWithProviders(
        <DiffHighlight oldText="the cat sat" newText="the dog sat" />,
      );

      expect(container.textContent).toBe('the catdog sat');
    });
  });
});
