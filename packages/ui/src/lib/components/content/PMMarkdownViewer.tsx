import { Box } from '@chakra-ui/react';
import { marked } from 'marked';
import { ComponentPropsWithoutRef, useMemo } from 'react';

export type PMMarkdownViewerProps = {
  content: string;
  sanitize?: boolean;
} & Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'dangerouslySetInnerHTML'
>;

export function PMMarkdownViewer({
  content,
  sanitize = true,
  ...rest
}: PMMarkdownViewerProps) {
  const htmlContent = useMemo(() => {
    // Configure marked options
    marked.setOptions({
      breaks: true,
      gfm: true,
    });

    const html = marked(content);
    return html;
  }, [content]);

  const defaultStyles: React.CSSProperties = {
    lineHeight: '1.6',
    color: 'inherit',
    backgroundColor: '{colors.background.primary}',
  };

  return (
    <>
      <style>
        {`
          .pm-markdown-viewer h1,
          .pm-markdown-viewer h2,
          .pm-markdown-viewer h3,
          .pm-markdown-viewer h4,
          .pm-markdown-viewer h5,
          .pm-markdown-viewer h6 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            font-weight: bold;
          }

          .pm-markdown-viewer h1 { font-size: 2rem; }
          .pm-markdown-viewer h2 { font-size: 1.5rem; }
          .pm-markdown-viewer h3 { font-size: 1.25rem; }
          .pm-markdown-viewer h4 { font-size: 1rem; }
          .pm-markdown-viewer h5 { font-size: 0.875rem; }
          .pm-markdown-viewer h6 { font-size: 0.75rem; }

          .pm-markdown-viewer p {
            margin-bottom: 1em;
          }

          .pm-markdown-viewer ul,
          .pm-markdown-viewer ol {
            list-style: disc;
            margin-bottom: 1em;
            padding-left: 2em;
          }

          .pm-markdown-viewer li {
            margin-bottom: 0.25em;
          }

          .pm-markdown-viewer code {
            background-color: var(--Palette-Neutral-Beige1000);
            padding: 0.2em 0.4em;
            border-radius: 4px;
            font-size: 0.875rem;
            font-family: 'Courier New', monospace;
          }

          .pm-markdown-viewer pre {
            background-color: var(--Palette-Neutral-Beige1000);
            padding: 1em;
            border-radius: 4px;
            overflow: auto;
            margin-bottom: 1em;
          }

          .pm-markdown-viewer pre code {
            background-color: transparent;
            padding: 0;
          }

          .pm-markdown-viewer a {
            color: #var(--Palette-Neutral-Beige200);
            text-decoration: underline;
          }

          .pm-markdown-viewer a:hover {
            color: var(--Palette-Neutral-Beige0);
          }

          .pm-markdown-viewer blockquote {
            border-left: 4px solid var(--Palette-Neutral-Beige0);
            padding: 1em;
            margin-left: 0;
            margin-bottom: 1em;
            font-style: italic;
            color: var(--Palette-Neutral-Beige200);
            background-color: var(--Palette-Neutral-Beige1000);
          }

          .pm-markdown-viewer table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 1em;
          }

          .pm-markdown-viewer th,
          .pm-markdown-viewer td {
            border: 1px solid var(--Palette-Neutral-Beige1000);
            padding: 0.5em;
            text-align: left;
          }

          .pm-markdown-viewer th {
            background-color: var(--Palette-Neutral-Beige1000);
            font-weight: bold;
          }

          .pm-markdown-viewer img {
            max-width: 100%;
            height: auto;
            margin-bottom: 1em;
          }

          .pm-markdown-viewer hr {
            border: none;
            border-top: 1px solid var(--Palette-Neutral-Beige1000);
            margin: 2em 0;
          }
        `}
      </style>
      <Box
        as="div"
        className="pm-markdown-viewer"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        style={defaultStyles}
        {...rest}
      />
    </>
  );
}
