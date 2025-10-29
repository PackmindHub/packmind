import { PMPage, PMText, PMMarkdownViewer, PMVStack } from '@packmind/ui';
import { useParams } from 'react-router';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { AGENT_BLUEPRINTS } from '../../src/domain/agent-blueprints/constants/blueprints';
import { useEffect, useState } from 'react';

// Import all markdown files from the blueprints directory
const markdownFiles = import.meta.glob(
  '../../src/domain/agent-blueprints/constants/blueprints/*.md',
  { query: '?raw', import: 'default' },
);

export default function AgentBlueprintDetailRouteModule() {
  const { blueprintId } = useParams<{ blueprintId: string }>();
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const blueprint = AGENT_BLUEPRINTS.find((b) => b.uuid === blueprintId);

  useEffect(() => {
    if (!blueprint) {
      setIsLoading(false);
      return;
    }

    const loadMarkdown = async () => {
      try {
        setIsLoading(true);
        // Construct the full path to match the glob pattern
        const markdownPath = `../../src/domain/agent-blueprints/constants/blueprints/${blueprint.description}`;

        // Find the loader function for this file
        const loader = markdownFiles[markdownPath];

        if (!loader) {
          throw new Error(`Markdown file not found: ${blueprint.description}`);
        }

        // Load the markdown content
        const content = await loader();
        setMarkdownContent(content as string);
        setError(null);
      } catch (err) {
        console.error('Failed to load markdown:', err);
        setError('Failed to load blueprint content');
      } finally {
        setIsLoading(false);
      }
    };

    loadMarkdown();
  }, [blueprint]);

  if (!blueprint) {
    return (
      <PMPage
        title="Agent Blueprint Not Found"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMText>
          The requested agent blueprint could not be found. Please check the URL
          and try again.
        </PMText>
      </PMPage>
    );
  }

  return (
    <PMPage title={blueprint.name} breadcrumbComponent={<AutobreadCrumb />}>
      <PMVStack align="stretch" gap={4}>
        <PMText fontSize="sm" color="secondary">
          Author: {blueprint.author} | Version: {blueprint.version}
        </PMText>

        {isLoading && <PMText>Loading blueprint content...</PMText>}

        {error && <PMText color="error">{error}</PMText>}

        {!isLoading && !error && markdownContent && (
          <PMMarkdownViewer content={markdownContent} />
        )}

        {!isLoading && !error && !markdownContent && (
          <PMText color="secondary">
            No content available for this blueprint.
          </PMText>
        )}
      </PMVStack>
    </PMPage>
  );
}
