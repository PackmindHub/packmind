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

function buildSkillUrl(
  host: string,
  orgSlug: string,
  skillSlug: string,
): string {
  return `${host}/org/${orgSlug}/space/global/skills/${skillSlug}/files`;
}

export type ListSkillsHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
  log: typeof console.log;
  error: typeof console.error;
  files?: boolean;
  lockFileRepository?: ILockFileRepository;
  getCwd?: () => string;
};

export async function listSkillsHandler(
  deps: ListSkillsHandlerDependencies,
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
    log('Fetching skills...\n');
    const skills = await packmindCliHexa.listSkills({});

    if (skills.length === 0) {
      log('No skills found.');
      exit(0);
      return;
    }

    const sortedSkills = [...skills].sort((a, b) =>
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
    let urlBuilder: ((slug: string) => string) | null = null;
    const apiKey = loadApiKey();
    if (apiKey) {
      const decoded = decodeApiKey(apiKey);
      const orgSlug = decoded?.jwt?.organization?.slug;
      if (decoded?.host && orgSlug) {
        urlBuilder = (slug: string) =>
          buildSkillUrl(decoded.host, orgSlug, slug);
      }
    }

    const agentsHeader =
      files && lockFiles.length > 0 ? formatAgentsHeader(lockFiles) : '';
    log(formatHeader(`🛠  Skills (${sortedSkills.length})${agentsHeader}\n`));

    sortedSkills.forEach((skill, index) => {
      log(`  ${formatSlug(skill.slug)}  ${formatLabel(`"${skill.name}"`)}`);
      if (urlBuilder) {
        const url = urlBuilder(skill.slug);
        log(`  ${formatLabel('Link:')}  ${url}`);
      }
      if (skill.description) {
        const descriptionLines = skill.description
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
        renderArtifactFiles(lockFiles, 'skill', skill.slug, log);
      }
      if (index < sortedSkills.length - 1) {
        log('');
      }
    });

    exit(0);
  } catch (err) {
    error('\n❌ Failed to list skills:');
    if (err instanceof Error) {
      error(`   ${err.message}`);
    } else {
      error(`   ${String(err)}`);
    }
    exit(1);
  }
}
