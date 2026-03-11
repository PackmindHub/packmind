import { PackmindCliHexa } from '../../PackmindCliHexa';
import { ILockFileRepository } from '../../domain/repositories/ILockFileRepository';
import {
  formatSlug,
  formatLabel,
  formatHeader,
  logWarningConsole,
} from '../utils/consoleLogger';
import { loadApiKey, decodeApiKey } from '../utils/credentials';
import {
  renderArtifactFiles,
  formatAgentsHeader,
} from '../utils/renderArtifactFiles';

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
  files?: boolean;
  lockFileRepository?: ILockFileRepository;
  getCwd?: () => string;
};

export async function listStandardsHandler(
  deps: ListStandardsHandlerDependencies,
): Promise<void> {
  const {
    packmindCliHexa,
    exit,
    log,
    error,
    files,
    lockFileRepository,
    getCwd,
  } = deps;

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

    // Read lock files if --files flag is passed
    const lockFiles =
      files && lockFileRepository && getCwd
        ? await lockFileRepository.readAll(getCwd())
        : [];

    if (files && lockFiles.length === 0) {
      logWarningConsole(
        "No packmind-lock.json found. Run 'packmind install' first.",
      );
    }

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

    const agentsHeader =
      files && lockFiles.length > 0 ? formatAgentsHeader(lockFiles) : '';
    log(
      formatHeader(`📐 Standards (${sortedStandards.length})${agentsHeader}\n`),
    );

    sortedStandards.forEach((standard, index) => {
      log(
        `  ${formatSlug(standard.slug)}  ${formatLabel(`"${standard.name}"`)}`,
      );
      if (urlBuilder) {
        const url = urlBuilder(standard.id);
        log(`  ${formatLabel('Link:')}  ${url}`);
      }
      if (standard.description) {
        const descriptionLines = standard.description
          .trim()
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
        const firstLine = descriptionLines[0];
        if (firstLine) {
          const truncated =
            firstLine.length > 80 ? firstLine.slice(0, 77) + '...' : firstLine;
          log(`  ${formatLabel('Desc:')}  ${truncated}`);
        }
      }
      if (files && lockFiles.length > 0) {
        renderArtifactFiles(lockFiles, 'standard', standard.slug, log);
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
