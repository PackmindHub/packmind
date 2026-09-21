import {
  describeForVersion,
  describeWithUserSignedUp,
  RunCliResult,
  UserSignedUpContext,
} from './helpers';
import { Package, CommandId, StandardId } from '@packmind/types';

/**
 * An artefact belongs to a single package: `packages add` refuses to put one in
 * a second package, `packages move` relocates it, and `packages remove` takes
 * it out. These three commands are covered together because every case is
 * about the same thing — which packages hold the artefact once the CLI exits.
 */

type SeededCommand = {
  id: CommandId;
  slug: string;
  name: string;
};

const COMMAND_NAME = 'Deploy service';
const STANDARD_NAME = 'Naming conventions';

async function seedCommand(
  context: UserSignedUpContext,
): Promise<SeededCommand> {
  const command = await context.gateway.commands.create({
    name: COMMAND_NAME,
    summary: 'A command used by the packages membership e2e suite',
    spaceId: context.space.id,
    steps: [{ name: 'Step one', description: 'Do the thing' }],
  });

  return { id: command.id, slug: command.slug, name: command.name };
}

async function seedStandard(
  context: UserSignedUpContext,
): Promise<{ id: StandardId; slug: string }> {
  const { standard } = await context.gateway.standards.create({
    name: STANDARD_NAME,
    description: 'A standard used by the packages membership e2e suite',
    rules: [],
    scope: '',
    spaceId: context.space.id,
  });

  return { id: standard.id, slug: standard.slug };
}

async function seedPackage(
  context: UserSignedUpContext,
  name: string,
  contents: { recipeIds?: CommandId[]; standardIds?: StandardId[] } = {},
): Promise<Package> {
  const { package: pkg } = await context.gateway.packages.create({
    name,
    description: 'A package used by the packages membership e2e suite',
    recipeIds: contents.recipeIds ?? [],
    standardIds: contents.standardIds ?? [],
    spaceId: context.space.id,
  });

  return pkg;
}

function packageRef(context: UserSignedUpContext, pkg: Package): string {
  return `@${context.space.slug}/${pkg.slug}`;
}

describeForVersion('> 0.35.1', 'packages membership commands', () => {
  describeWithUserSignedUp(
    'packages move when the command is in no package',
    (getContext) => {
      let context: UserSignedUpContext;
      let target: Package;
      let result: RunCliResult;
      let targetContents: RunCliResult;

      beforeEach(async () => {
        context = await getContext();
        const command = await seedCommand(context);
        target = await seedPackage(context, 'Target package');

        result = await context.runCli(
          `packages move --command ${command.slug} --to ${packageRef(context, target)}`,
        );
        targetContents = await context.runCli(
          `packages show ${packageRef(context, target)}`,
        );
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('reports the command was added to the target package', () => {
        expect(result.stdout).toContain(
          `Command "${COMMAND_NAME}" has been added to package "${packageRef(context, target)}"`,
        );
      });

      it('leaves the command in the target package', () => {
        expect(targetContents.stdout).toContain(COMMAND_NAME);
      });
    },
  );

  describeWithUserSignedUp(
    'packages move when the command is in another package',
    (getContext) => {
      let context: UserSignedUpContext;
      let source: Package;
      let target: Package;
      let result: RunCliResult;
      let sourceContents: RunCliResult;

      beforeEach(async () => {
        context = await getContext();
        const command = await seedCommand(context);
        source = await seedPackage(context, 'Source package', {
          recipeIds: [command.id],
        });
        target = await seedPackage(context, 'Target package');

        result = await context.runCli(
          `packages move --command ${command.slug} --to ${packageRef(context, target)}`,
        );
        sourceContents = await context.runCli(
          `packages show ${packageRef(context, source)}`,
        );
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('reports the command was added to the target package', () => {
        expect(result.stdout).toContain(
          `Command "${COMMAND_NAME}" has been added to package "${packageRef(context, target)}"`,
        );
      });

      it('reports the package the command left', () => {
        expect(result.stdout).toContain(
          `It has been removed from "${packageRef(context, source)}"`,
        );
      });

      it('empties the source package', () => {
        expect(sourceContents.stdout).not.toContain('Commands:');
      });
    },
  );

  describeWithUserSignedUp(
    'packages move when the command is already in the target package only',
    (getContext) => {
      let context: UserSignedUpContext;
      let target: Package;
      let result: RunCliResult;

      beforeEach(async () => {
        context = await getContext();
        const command = await seedCommand(context);
        target = await seedPackage(context, 'Target package', {
          recipeIds: [command.id],
        });

        result = await context.runCli(
          `packages move --command ${command.slug} --to ${packageRef(context, target)}`,
        );
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('reports that nothing changed', () => {
        expect(result.stdout).toContain(
          `Command "${COMMAND_NAME}" is already in package "${packageRef(context, target)}", nothing changed`,
        );
      });
    },
  );

  describeWithUserSignedUp(
    'packages move when the command is in the target package and another one',
    (getContext) => {
      let context: UserSignedUpContext;
      let other: Package;
      let target: Package;
      let result: RunCliResult;

      beforeEach(async () => {
        context = await getContext();
        const command = await seedCommand(context);
        target = await seedPackage(context, 'Target package', {
          recipeIds: [command.id],
        });
        other = await seedPackage(context, 'Other package', {
          recipeIds: [command.id],
        });

        result = await context.runCli(
          `packages move --command ${command.slug} --to ${packageRef(context, target)}`,
        );
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('reports the command was already in the target package', () => {
        expect(result.stdout).toContain(
          `Command "${COMMAND_NAME}" is already in package "${packageRef(context, target)}"`,
        );
      });

      it('reports the other package the command left', () => {
        expect(result.stdout).toContain(
          `It has been removed from "${packageRef(context, other)}"`,
        );
      });
    },
  );

  describeWithUserSignedUp(
    'packages move when the command is in several other packages',
    (getContext) => {
      let context: UserSignedUpContext;
      let firstSource: Package;
      let secondSource: Package;
      let target: Package;
      let result: RunCliResult;

      beforeEach(async () => {
        context = await getContext();
        const command = await seedCommand(context);
        firstSource = await seedPackage(context, 'First source package', {
          recipeIds: [command.id],
        });
        secondSource = await seedPackage(context, 'Second source package', {
          recipeIds: [command.id],
        });
        target = await seedPackage(context, 'Target package');

        result = await context.runCli(
          `packages move --command ${command.slug} --to ${packageRef(context, target)}`,
        );
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('introduces the packages the command left as a list', () => {
        expect(result.stdout).toContain(
          'It has been removed from the following packages:',
        );
      });

      it('lists the first package the command left', () => {
        expect(result.stdout).toContain(
          ` - ${packageRef(context, firstSource)}`,
        );
      });

      it('lists the second package the command left', () => {
        expect(result.stdout).toContain(
          ` - ${packageRef(context, secondSource)}`,
        );
      });
    },
  );

  describeWithUserSignedUp(
    'packages move for a standard in another package',
    (getContext) => {
      let context: UserSignedUpContext;
      let source: Package;
      let target: Package;
      let result: RunCliResult;

      beforeEach(async () => {
        context = await getContext();
        const standard = await seedStandard(context);
        source = await seedPackage(context, 'Source package', {
          standardIds: [standard.id],
        });
        target = await seedPackage(context, 'Target package');

        result = await context.runCli(
          `packages move --standard ${standard.slug} --to ${packageRef(context, target)}`,
        );
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('reports the standard was added to the target package', () => {
        expect(result.stdout).toContain(
          `Standard "${STANDARD_NAME}" has been added to package "${packageRef(context, target)}"`,
        );
      });

      it('reports the package the standard left', () => {
        expect(result.stdout).toContain(
          `It has been removed from "${packageRef(context, source)}"`,
        );
      });
    },
  );

  describeWithUserSignedUp(
    'packages add when the command is in no package',
    (getContext) => {
      let context: UserSignedUpContext;
      let target: Package;
      let result: RunCliResult;
      let targetContents: RunCliResult;

      beforeEach(async () => {
        context = await getContext();
        const command = await seedCommand(context);
        target = await seedPackage(context, 'Target package');

        result = await context.runCli(
          `packages add --command ${command.slug} --to ${packageRef(context, target)}`,
        );
        targetContents = await context.runCli(
          `packages show ${packageRef(context, target)}`,
        );
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('reports the command was added', () => {
        expect(result.stdout).toContain(
          `added to "${packageRef(context, target)}"`,
        );
      });

      it('leaves the command in the target package', () => {
        expect(targetContents.stdout).toContain(COMMAND_NAME);
      });
    },
  );

  describeWithUserSignedUp(
    'packages add when the command is already in another package',
    (getContext) => {
      let context: UserSignedUpContext;
      let command: SeededCommand;
      let source: Package;
      let target: Package;
      let result: RunCliResult;
      let targetContents: RunCliResult;

      beforeEach(async () => {
        context = await getContext();
        command = await seedCommand(context);
        source = await seedPackage(context, 'Source package', {
          recipeIds: [command.id],
        });
        target = await seedPackage(context, 'Target package');

        result = await context.runCli(
          `packages add --command ${command.slug} --to ${packageRef(context, target)}`,
        );
        targetContents = await context.runCli(
          `packages show ${packageRef(context, target)}`,
        );
      });

      it('fails', () => {
        expect(result.returnCode).toBe(1);
      });

      it('names the package already holding the command', () => {
        expect(result.stdout).toContain(
          `Command "${COMMAND_NAME}" already belongs to package "${packageRef(context, source)}"`,
        );
      });

      it('prints the move command to run instead', () => {
        expect(result.stdout).toContain(
          `packmind packages move --command ${command.slug} --to ${packageRef(context, target)}`,
        );
      });

      it('leaves the target package untouched', () => {
        expect(targetContents.stdout).not.toContain('Commands:');
      });
    },
  );

  describeWithUserSignedUp(
    'packages add when the command is already in the target package',
    (getContext) => {
      let context: UserSignedUpContext;
      let target: Package;
      let result: RunCliResult;

      beforeEach(async () => {
        context = await getContext();
        const command = await seedCommand(context);
        target = await seedPackage(context, 'Target package', {
          recipeIds: [command.id],
        });

        result = await context.runCli(
          `packages add --command ${command.slug} --to ${packageRef(context, target)}`,
        );
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('reports the command as skipped', () => {
        // The skipped notice is a warning, which the CLI writes to stderr.
        expect(result.stderr).toContain(
          `already in "${packageRef(context, target)}" (skipped)`,
        );
      });
    },
  );

  describeWithUserSignedUp(
    'packages remove when the command is in the package',
    (getContext) => {
      let context: UserSignedUpContext;
      let pkg: Package;
      let result: RunCliResult;
      let packageContents: RunCliResult;

      beforeEach(async () => {
        context = await getContext();
        const command = await seedCommand(context);
        pkg = await seedPackage(context, 'Target package', {
          recipeIds: [command.id],
        });

        result = await context.runCli(
          `packages remove --command ${command.slug} --from ${packageRef(context, pkg)}`,
        );
        packageContents = await context.runCli(
          `packages show ${packageRef(context, pkg)}`,
        );
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('reports the removal', () => {
        expect(result.stdout).toContain(
          `Command "${COMMAND_NAME}" has been removed from package "${packageRef(context, pkg)}"`,
        );
      });

      it('reports the command now belongs to no package', () => {
        expect(result.stdout).toContain(
          'It does not belong to any package anymore',
        );
      });

      it('empties the package', () => {
        expect(packageContents.stdout).not.toContain('Commands:');
      });
    },
  );

  describeWithUserSignedUp(
    'packages remove when the command is not in the package',
    (getContext) => {
      let context: UserSignedUpContext;
      let pkg: Package;
      let result: RunCliResult;

      beforeEach(async () => {
        context = await getContext();
        const command = await seedCommand(context);
        pkg = await seedPackage(context, 'Target package');

        result = await context.runCli(
          `packages remove --command ${command.slug} --from ${packageRef(context, pkg)}`,
        );
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('reports that nothing changed', () => {
        expect(result.stdout).toContain(
          `Command "${COMMAND_NAME}" is not in package "${packageRef(context, pkg)}", nothing changed`,
        );
      });
    },
  );

  describeWithUserSignedUp(
    'packages remove when the command is in several packages',
    (getContext) => {
      let context: UserSignedUpContext;
      let pkg: Package;
      let otherPackage: Package;
      let result: RunCliResult;

      beforeEach(async () => {
        context = await getContext();
        const command = await seedCommand(context);
        pkg = await seedPackage(context, 'Target package', {
          recipeIds: [command.id],
        });
        otherPackage = await seedPackage(context, 'Other package', {
          recipeIds: [command.id],
        });

        result = await context.runCli(
          `packages remove --command ${command.slug} --from ${packageRef(context, pkg)}`,
        );
      });

      it('succeeds', () => {
        expect(result.returnCode).toBe(0);
      });

      it('reports the removal', () => {
        expect(result.stdout).toContain(
          `Command "${COMMAND_NAME}" has been removed from package "${packageRef(context, pkg)}"`,
        );
      });

      it('reports the package the command still belongs to', () => {
        expect(result.stdout).toContain(
          `It still belongs to package "${packageRef(context, otherPackage)}"`,
        );
      });
    },
  );
});
