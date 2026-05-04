import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PMMarkdownViewer } from './PMMarkdownViewer';
import { UIProvider } from '../../UIProvider';
import DOMPurify from 'dompurify';

jest.mock('marked', () => {
  type MockToken = { text: string };

  class MockMarked {
    Parser = {
      parseInline: (tokens: MockToken[]) => tokens.map((t) => t.text).join(''),
    };
    private renderers: Array<{
      link?: (token: {
        href: string;
        title: string | null;
        text: string;
        tokens: MockToken[];
      }) => string;
    }> = [];

    use(extension: {
      renderer?: {
        link?: (token: {
          href: string;
          title: string | null;
          text: string;
          tokens: MockToken[];
        }) => string;
      };
    }) {
      if (extension.renderer) {
        this.renderers.push(extension.renderer);
      }
      return this;
    }

    parse(content: string): string {
      const linkRenderer = this.renderers.find((r) => r.link)?.link;
      if (linkRenderer) {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const replaced = content.replace(linkRegex, (_, text, href) =>
          linkRenderer({
            href: href as string,
            title: null,
            text: text as string,
            tokens: [{ text: text as string }],
          }),
        );
        return `<p>${replaced}</p>`;
      }
      return `<p>${content}</p>`;
    }
  }

  return { Marked: MockMarked };
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

  describe('when transformLinkUri is provided', () => {
    it('rewrites anchor href values through the transformer', () => {
      const transformLinkUri = jest.fn(
        (href: string) => `/prefix/${href.replace(/^\.\//, '')}`,
      );

      const { container } = renderWithProvider(
        <PMMarkdownViewer
          content="[Helper](./helpers/foo.md)"
          sanitize={false}
          transformLinkUri={transformLinkUri}
        />,
      );

      expect(transformLinkUri).toHaveBeenCalledWith('./helpers/foo.md');
      const anchor = container.querySelector('a');
      expect(anchor).toHaveAttribute('href', '/prefix/helpers/foo.md');
      expect(anchor).toHaveTextContent('Helper');
    });
  });

  describe('when onLinkClick is provided', () => {
    it('invokes onLinkClick with the anchor href on left-click without modifiers', () => {
      const onLinkClick = jest.fn();
      const transformLinkUri = (href: string) => `/transformed/${href}`;

      const { container } = renderWithProvider(
        <PMMarkdownViewer
          content="[Link](target.md)"
          sanitize={false}
          transformLinkUri={transformLinkUri}
          onLinkClick={onLinkClick}
        />,
      );

      const anchor = container.querySelector('a');
      if (!anchor) throw new Error('expected anchor to be rendered');
      fireEvent.click(anchor, { button: 0 });

      expect(onLinkClick).toHaveBeenCalledTimes(1);
      expect(onLinkClick.mock.calls[0][0]).toBe('/transformed/target.md');
    });

    it('does not invoke onLinkClick when a modifier key is pressed', () => {
      const onLinkClick = jest.fn();

      const { container } = renderWithProvider(
        <PMMarkdownViewer
          content="[Link](target.md)"
          sanitize={false}
          transformLinkUri={(href) => `/x/${href}`}
          onLinkClick={onLinkClick}
        />,
      );

      const anchor = container.querySelector('a');
      if (!anchor) throw new Error('expected anchor to be rendered');
      fireEvent.click(anchor, { button: 0, metaKey: true });

      expect(onLinkClick).not.toHaveBeenCalled();
    });

    it('does not invoke onLinkClick when click target is not an anchor', () => {
      const onLinkClick = jest.fn();

      const { container } = renderWithProvider(
        <PMMarkdownViewer
          content="Plain text"
          sanitize={false}
          onLinkClick={onLinkClick}
        />,
      );

      const root = container.querySelector('.pm-markdown-viewer');
      if (!root) throw new Error('expected viewer root to be rendered');
      fireEvent.click(root, { button: 0 });

      expect(onLinkClick).not.toHaveBeenCalled();
    });
  });
});
