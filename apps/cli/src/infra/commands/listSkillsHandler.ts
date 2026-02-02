import { PackmindCliHexa } from '../../PackmindCliHexa';
import { formatSlug, formatLabel } from '../utils/consoleLogger';

export type ListSkillsHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
  log: typeof console.log;
  error: typeof console.error;
};

export async function listSkillsHandler(
  deps: ListSkillsHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, exit, log, error } = deps;

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

    log('Available skills:\n');
    sortedSkills.forEach((skill, index) => {
      log(`- 🔗 ${formatSlug(skill.slug)}`);
      log(`    ${formatLabel('Name:')} ${skill.name}`);
      if (skill.description) {
        const descriptionLines = skill.description
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
