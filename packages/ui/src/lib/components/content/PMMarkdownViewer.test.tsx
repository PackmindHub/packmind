import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PMMarkdownViewer } from './PMMarkdownViewer';
import { UIProvider } from '../../UIProvider';
import DOMPurify from 'dompurify';

jest.mock('marked', () => {
  const mockMarked = jest.fn((content: string) => `<p>${content}</p>`);
  mockMarked.setOptions = jest.fn();
  return { marked: mockMarked };
});

jest.mock('dompurify', () => ({
  __esModule: true,
  default: {
    sanitize: jest.fn((html: string) => html),
  },
}));

const renderWithProvider = (ui: React.ReactElement) =>
  render(<UIProvider>{ui}</UIProvider>);

describe('PMMarkdownViewer', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when sanitize is true (default)', () => {
    it('calls DOMPurify.sanitize on the HTML content', () => {
      renderWithProvider(<PMMarkdownViewer content="# Hello" />);

      expect(DOMPurify.sanitize).toHaveBeenCalledWith('<p># Hello</p>');
    });

    it('calls DOMPurify.sanitize with explicit sanitize prop', () => {
      renderWithProvider(<PMMarkdownViewer content="Test content" sanitize />);

      expect(DOMPurify.sanitize).toHaveBeenCalledWith('<p>Test content</p>');
    });
  });

  describe('when sanitize is false', () => {
    it('does not call DOMPurify.sanitize', () => {
      renderWithProvider(
        <PMMarkdownViewer content="Unsafe content" sanitize={false} />,
      );

      expect(DOMPurify.sanitize).not.toHaveBeenCalled();
    });

    it('renders content without calling DOMPurify', () => {
      const { container } = renderWithProvider(
        <PMMarkdownViewer content="Unsafe content" sanitize={false} />,
      );

      expect(container.querySelector('.pm-markdown-viewer')).toHaveTextContent(
        'Unsafe content',
      );
    });
  });

  describe('when rendering content', () => {
    it('applies pm-markdown-viewer class to container', () => {
      const { container } = renderWithProvider(
        <PMMarkdownViewer content="Test" />,
      );

      expect(
        container.querySelector('.pm-markdown-viewer'),
      ).toBeInTheDocument();
    });

    it('renders HTML content inside the container', () => {
      const { container } = renderWithProvider(
        <PMMarkdownViewer content="Hello World" />,
      );

      expect(container.querySelector('.pm-markdown-viewer')?.innerHTML).toBe(
        '<p>Hello World</p>',
      );
    });
  });
});
