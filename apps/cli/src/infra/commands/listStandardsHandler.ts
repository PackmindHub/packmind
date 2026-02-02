import { PackmindCliHexa } from '../../PackmindCliHexa';
import { formatSlug, formatLabel } from '../utils/consoleLogger';
import { loadApiKey, decodeApiKey } from '../utils/credentials';

function buildStandardUrl(
  host: string,
  orgSlug: string,
  standardId: string,
): string {
  return `${host}/org/${orgSlug}/space/global/standards/${standardId}/summary`;
}

export type ListStandardsHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
  log: typeof console.log;
  error: typeof console.error;
};

export async function listStandardsHandler(
  deps: ListStandardsHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, exit, log, error } = deps;

  try {
    log('Fetching standards...\n');
    const standards = await packmindCliHexa.listStandards({});

    if (standards.length === 0) {
      log('No standards found.');
      exit(0);
      return;
    }

    const sortedStandards = [...standards].sort((a, b) =>
      a.slug.localeCompare(b.slug),
    );

    // Try to build webapp URL from credentials
    let urlBuilder: ((id: string) => string) | null = null;
    const apiKey = loadApiKey();
    if (apiKey) {
      const decoded = decodeApiKey(apiKey);
      const orgSlug = decoded?.jwt?.organization?.slug;
      if (decoded?.host && orgSlug) {
        urlBuilder = (id: string) =>
          buildStandardUrl(decoded.host, orgSlug, id);
      }
    }

    log('Available standards:\n');
    sortedStandards.forEach((standard, index) => {
      log(`- ${formatSlug(standard.slug)}`);
      log(`    ${formatLabel('Name:')} ${standard.name}`);
      if (urlBuilder) {
        log(`    ${formatLabel('URL:')} ${urlBuilder(standard.id)}`);
      }
      if (standard.description) {
        const descriptionLines = standard.description
          .trim()
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
        const [firstLine, ...restLines] = descriptionLines;
        log(`    ${formatLabel('Description:')} ${firstLine}`);
        restLines.forEach((line) => {
          log(`                 ${line}`);
        });
      }
      if (index < sortedStandards.length - 1) {
        log('');
      }
    });

    exit(0);
  } catch (err) {
    error('\n❌ Failed to list standards:');
    if (err instanceof Error) {
      error(`   ${err.message}`);
    } else {
      error(`   ${String(err)}`);
    }
    exit(1);
  }
}
