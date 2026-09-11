import {
  createCommandId,
  createPackageId,
  createSkillId,
  createStandardId,
  type Command,
  type PackageId,
  type Skill,
  type Standard,
} from '@packmind/types';
import type {
  ContextComponent,
  ContextComponentType,
  ContextGroup,
  PackageComponentIds,
  SpaceCatalogue,
} from './buildPackageContext';
import {
  COMPONENTS_TAB,
  findSpaceComponent,
  inventoryHref,
  selectContextPackage,
  DISTRIBUTION_TAB,
  HISTORY_TAB,
  INSTRUCTIONS_TAB,
  isComponentOnlyTab,
  componentDetailHref,
  componentEditHref,
  componentEntryHref,
  componentFileHref,
  componentRuleHref,
  contextComponentHref,
  contextPackageHref,
  packageDetailHref,
  packageDetailParams,
  selectDetailComponent,
  selectRuleTab,
  selectSkillFile,
  selectStandardRule,
  sortFilesByPath,
  isDefaultTab,
  isRuleOnlyTab,
  LINTER_TAB,
  EXAMPLES_TAB,
  selectTab,
  sortRulesByContent,
  withPaneDetailHref,
} from './buildComponentDetail';

const PACKAGE = createPackageId('pkg-1');
const TARGET = { orgSlug: 'acme', spaceSlug: 'core' };

const component = (
  type: ContextComponentType,
  key: string,
  name = key,
): ContextComponent => ({
  key,
  type,
  name,
  summary: '',
  version: 3,
  href: `/org/acme/space/core/${type}s/${key}`,
});

const group = (
  type: ContextComponentType,
  components: ContextComponent[],
): ContextGroup => ({ type, label: `${type}s`, components });

describe('componentDetailHref', () => {
  it('names the package and the component', () => {
    expect(
      componentDetailHref(new URLSearchParams(), PACKAGE, 'command-1'),
    ).toBe('?package=pkg-1&component=command-1');
  });

  it('keeps the parameters it was handed', () => {
    expect(
      componentDetailHref(
        new URLSearchParams('nav=plugin-first'),
        PACKAGE,
        'command-1',
      ),
    ).toBe('?nav=plugin-first&package=pkg-1&component=command-1');
  });

  it('drops the file the previous component was open on', () => {
    expect(
      componentDetailHref(
        new URLSearchParams('component=skill-0&file=SCRIPT.md'),
        PACKAGE,
        'skill-1',
      ),
    ).toBe('?component=skill-1&package=pkg-1');
  });

  it('replaces the component already in the address', () => {
    expect(
      componentDetailHref(
        new URLSearchParams('package=pkg-1&component=command-0'),
        PACKAGE,
        'command-1',
      ),
    ).toBe('?package=pkg-1&component=command-1');
  });
});

describe('packageDetailParams', () => {
  it('leaves the package open with no component in it', () => {
    expect(
      packageDetailParams(
        new URLSearchParams('package=pkg-1&component=command-1&file=run.sh'),
        PACKAGE,
      ).toString(),
    ).toBe('package=pkg-1');
  });

  describe('when the caller was reading another package', () => {
    it('names the one it was given', () => {
      expect(
        packageDetailParams(
          new URLSearchParams('package=pkg-9&component=command-1'),
          PACKAGE,
        ).get('package'),
      ).toBe('pkg-1');
    });
  });

  it('hands back a copy, so the caller keeps its own parameters', () => {
    const original = new URLSearchParams('package=pkg-1&component=command-1');

    packageDetailParams(original, PACKAGE);

    expect(original.get('component')).toBe('command-1');
  });

  describe('when the component was being read on a tab a package does not have', () => {
    it('drops the tab as well, so the next component does not inherit it', () => {
      expect(
        packageDetailParams(
          new URLSearchParams(
            `package=pkg-1&component=command-1&tab=${HISTORY_TAB}`,
          ),
          PACKAGE,
        ).has('tab'),
      ).toBe(false);
    });
  });

  describe('when the tab is one both depths have', () => {
    it('keeps it, so closing a component stays on the same question', () => {
      expect(
        packageDetailParams(
          new URLSearchParams(
            `package=pkg-1&component=command-1&tab=${DISTRIBUTION_TAB}`,
          ),
          PACKAGE,
        ).get('tab'),
      ).toBe(DISTRIBUTION_TAB);
    });
  });
});

describe('packageDetailHref', () => {
  it('drops the component', () => {
    expect(
      packageDetailHref(
        new URLSearchParams('package=pkg-1&component=command-1'),
        PACKAGE,
      ),
    ).toBe('?package=pkg-1');
  });

  it('drops the file as well as the component', () => {
    expect(
      packageDetailHref(
        new URLSearchParams('component=skill-1&file=scripts/run.sh'),
        PACKAGE,
      ),
    ).toBe('?package=pkg-1');
  });

  it('keeps the tab the package was read on', () => {
    expect(
      packageDetailHref(
        new URLSearchParams('tab=distribution&component=command-1'),
        PACKAGE,
      ),
    ).toBe('?tab=distribution&package=pkg-1');
  });
});

describe('contextPackageHref', () => {
  it('names the surface and the package', () => {
    expect(contextPackageHref(TARGET, PACKAGE)).toBe(
      '/org/acme/space/core/context?package=pkg-1',
    );
  });

  describe('when a component is asked for', () => {
    it('opens it in the package', () => {
      expect(contextPackageHref(TARGET, PACKAGE, 'standard-1')).toBe(
        '/org/acme/space/core/context?package=pkg-1&component=standard-1',
      );
    });
  });

  describe('when the component key needs escaping', () => {
    it('escapes it', () => {
      expect(contextPackageHref(TARGET, PACKAGE, 'a b&c')).toBe(
        '/org/acme/space/core/context?package=pkg-1&component=a+b%26c',
      );
    });
  });
});

describe('contextComponentHref', () => {
  it('names the surface and the component', () => {
    expect(contextComponentHref(TARGET, 'standard-1')).toBe(
      '/org/acme/space/core/context?component=standard-1',
    );
  });

  /*
    The addresses this replaces name no package either, and the surface resolves
    one from the component. Naming one here would pick a package for a reader
    who never asked for it.
  */
  it('names no package', () => {
    expect(contextComponentHref(TARGET, 'standard-1')).not.toContain('package');
  });

  describe('when a file is asked for', () => {
    it('opens the component on that file', () => {
      expect(contextComponentHref(TARGET, 'skill-1', 'setup/install.md')).toBe(
        '/org/acme/space/core/context?component=skill-1&file=setup%2Finstall.md',
      );
    });
  });

  describe('when no file is asked for', () => {
    it('leaves the file out of the address', () => {
      expect(contextComponentHref(TARGET, 'skill-1', null)).toBe(
        '/org/acme/space/core/context?component=skill-1',
      );
    });
  });
});

describe('withPaneDetailHref', () => {
  it('points a command at the pane', () => {
    expect(
      withPaneDetailHref(
        component('command', 'command-1'),
        new URLSearchParams(),
        PACKAGE,
      ).href,
    ).toBe('?package=pkg-1&component=command-1');
  });

  it('points a standard at the pane', () => {
    expect(
      withPaneDetailHref(
        component('standard', 'standard-1'),
        new URLSearchParams(),
        PACKAGE,
      ).href,
    ).toBe('?package=pkg-1&component=standard-1');
  });

  it('points a skill at the pane', () => {
    expect(
      withPaneDetailHref(
        component('skill', 'skill-1'),
        new URLSearchParams(),
        PACKAGE,
      ).href,
    ).toBe('?package=pkg-1&component=skill-1');
  });

  it('changes nothing else about the row', () => {
    const rewritten = withPaneDetailHref(
      component('command', 'command-1', 'Ship it'),
      new URLSearchParams(),
      PACKAGE,
    );

    expect(rewritten).toEqual({
      key: 'command-1',
      type: 'command',
      name: 'Ship it',
      summary: '',
      version: 3,
      href: '?package=pkg-1&component=command-1',
    });
  });
});

describe('selectDetailComponent', () => {
  const groups = [
    group('standard', [component('standard', 'standard-1')]),
    group('command', [
      component('command', 'command-1'),
      component('command', 'command-2'),
    ]),
    group('skill', [component('skill', 'skill-1')]),
  ];

  describe('when the address asks for nothing', () => {
    it('shows the list', () => {
      expect(selectDetailComponent(groups, null)).toBeNull();
    });
  });

  it('finds the requested command', () => {
    expect(selectDetailComponent(groups, 'command-2')?.name).toBe('command-2');
  });

  it('searches every group', () => {
    expect(selectDetailComponent(groups, 'command-1')?.type).toBe('command');
  });

  it('finds the requested standard', () => {
    expect(selectDetailComponent(groups, 'standard-1')?.type).toBe('standard');
  });

  it('ignores a key no row carries', () => {
    expect(selectDetailComponent(groups, 'command-9')).toBeNull();
  });

  it('finds the requested skill', () => {
    expect(selectDetailComponent(groups, 'skill-1')?.type).toBe('skill');
  });

  it('ignores a request against an empty package', () => {
    expect(selectDetailComponent([], 'command-1')).toBeNull();
  });
});

describe('componentEditHref', () => {
  it('points a command at its edit form', () => {
    expect(componentEditHref(component('command', 'command-1'), TARGET)).toBe(
      '/org/acme/space/core/commands/command-1/edit',
    );
  });

  it('points a standard at its edit form', () => {
    expect(componentEditHref(component('standard', 'standard-1'), TARGET)).toBe(
      '/org/acme/space/core/standards/standard-1/edit',
    );
  });

  it('has nowhere to send a skill', () => {
    expect(componentEditHref(component('skill', 'skill-1'), TARGET)).toBeNull();
  });

  describe('when a package is given', () => {
    it('carries it into a command edit form', () => {
      expect(
        componentEditHref(component('command', 'command-1'), TARGET, PACKAGE),
      ).toBe('/org/acme/space/core/commands/command-1/edit?package=pkg-1');
    });

    it('carries it into a standard edit form', () => {
      expect(
        componentEditHref(component('standard', 'standard-1'), TARGET, PACKAGE),
      ).toBe('/org/acme/space/core/standards/standard-1/edit?package=pkg-1');
    });

    it('still has nowhere to send a skill', () => {
      expect(
        componentEditHref(component('skill', 'skill-1'), TARGET, PACKAGE),
      ).toBeNull();
    });
  });
});

describe('sortRulesByContent', () => {
  const rule = (content: string) => ({ id: content, content });

  it('orders the rules the way the standard page does', () => {
    expect(
      sortRulesByContent([rule('Never log'), rule('Always test')]).map(
        (r) => r.content,
      ),
    ).toEqual(['Always test', 'Never log']);
  });

  it('ignores case, so a lowercase rule is not exiled to the end', () => {
    expect(
      sortRulesByContent([rule('beta'), rule('Alpha'), rule('Gamma')]).map(
        (r) => r.content,
      ),
    ).toEqual(['Alpha', 'beta', 'Gamma']);
  });

  it('leaves the list it was given alone', () => {
    const rules = [rule('Never log'), rule('Always test')];
    sortRulesByContent(rules);

    expect(rules[0].content).toBe('Never log');
  });
});

describe('sortFilesByPath', () => {
  const file = (path: string) => ({ path });

  it('keeps the files of one folder together', () => {
    expect(
      sortFilesByPath([
        file('scripts/run.sh'),
        file('README.md'),
        file('scripts/build.sh'),
      ]).map((f) => f.path),
    ).toEqual(['README.md', 'scripts/build.sh', 'scripts/run.sh']);
  });

  it('ignores case, so a lowercase folder is not exiled to the end', () => {
    expect(
      sortFilesByPath([file('templates/a.md'), file('Assets/b.png')]).map(
        (f) => f.path,
      ),
    ).toEqual(['Assets/b.png', 'templates/a.md']);
  });

  it('leaves the list it was given alone', () => {
    const files = [file('scripts/run.sh'), file('README.md')];
    sortFilesByPath(files);

    expect(files[0].path).toBe('scripts/run.sh');
  });
});

describe('componentFileHref', () => {
  it('names the file and leaves the rest alone', () => {
    expect(
      componentFileHref(
        new URLSearchParams('package=pkg-1&component=skill-1'),
        'scripts/run.sh',
      ),
    ).toBe('?package=pkg-1&component=skill-1&file=scripts%2Frun.sh');
  });

  it('replaces the file already open', () => {
    expect(
      componentFileHref(
        new URLSearchParams('component=skill-1&file=a.md'),
        'b.md',
      ),
    ).toBe('?component=skill-1&file=b.md');
  });
});

describe('componentRuleHref', () => {
  it('names the rule and leaves the rest alone', () => {
    expect(
      componentRuleHref(
        new URLSearchParams('package=pkg-1&component=standard-1'),
        'rule-1',
      ),
    ).toBe('?package=pkg-1&component=standard-1&rule=rule-1');
  });

  it('replaces the rule already open', () => {
    expect(
      componentRuleHref(
        new URLSearchParams('component=standard-1&rule=rule-1'),
        'rule-2',
      ),
    ).toBe('?component=standard-1&rule=rule-2');
  });
});

describe('componentEntryHref', () => {
  it('keeps the component and drops the file', () => {
    expect(
      componentEntryHref(
        new URLSearchParams('package=pkg-1&component=skill-1&file=a.md'),
      ),
    ).toBe('?package=pkg-1&component=skill-1');
  });

  it('drops the rule the same way', () => {
    expect(
      componentEntryHref(
        new URLSearchParams('package=pkg-1&component=standard-1&rule=rule-1'),
      ),
    ).toBe('?package=pkg-1&component=standard-1');
  });

  describe('when the rule was being read on a tab only a rule has', () => {
    it('drops that tab with it', () => {
      expect(
        componentEntryHref(
          new URLSearchParams('component=standard-1&rule=rule-1&tab=linter'),
        ),
      ).toBe('?component=standard-1');
    });
  });

  describe('when the tab belongs to the component rather than the rule', () => {
    it('keeps it', () => {
      expect(
        componentEntryHref(
          new URLSearchParams('component=skill-1&file=a.md&tab=distribution'),
        ),
      ).toBe('?component=skill-1&tab=distribution');
    });
  });
});

describe('isRuleOnlyTab', () => {
  it('says so of the linter', () => {
    expect(isRuleOnlyTab(LINTER_TAB)).toBe(true);
  });

  it('says otherwise of the examples, which are the default', () => {
    expect(isRuleOnlyTab(EXAMPLES_TAB)).toBe(false);
  });
});

describe('selectRuleTab', () => {
  it('answers with the linter when the address asks for it', () => {
    expect(selectRuleTab(LINTER_TAB)).toBe(LINTER_TAB);
  });

  it('answers with the examples when the address says nothing', () => {
    expect(selectRuleTab(null)).toBe(EXAMPLES_TAB);
  });

  describe('when the address carries a tab of another depth', () => {
    it('reads it as the examples rather than as an error', () => {
      expect(selectRuleTab(DISTRIBUTION_TAB)).toBe(EXAMPLES_TAB);
    });
  });
});

describe('selectStandardRule', () => {
  const rules = [{ id: 'rule-1' }, { id: 'rule-2' }];

  it('answers with the rule the address names', () => {
    expect(selectStandardRule(rules, 'rule-2')).toEqual({ id: 'rule-2' });
  });

  describe('when the address asks for nothing', () => {
    it('answers with none, which shows the standard', () => {
      expect(selectStandardRule(rules, null)).toBeNull();
    });
  });

  describe('when the rule left the standard', () => {
    it('falls back to the standard rather than to an empty frame', () => {
      expect(selectStandardRule(rules, 'rule-9')).toBeNull();
    });
  });
});

describe('selectSkillFile', () => {
  const files = [{ path: 'scripts/run.sh' }, { path: 'references/why.md' }];

  describe('when the address asks for nothing', () => {
    it('shows the component itself', () => {
      expect(selectSkillFile(files, null)).toBeNull();
    });
  });

  it('finds the requested file', () => {
    expect(selectSkillFile(files, 'references/why.md')?.path).toBe(
      'references/why.md',
    );
  });

  it('ignores a path the skill no longer carries', () => {
    expect(selectSkillFile(files, 'scripts/gone.sh')).toBeNull();
  });

  it('falls back to the instructions for SKILL.md, which is not a file', () => {
    expect(selectSkillFile(files, 'SKILL.md')).toBeNull();
  });
});

describe('selectTab', () => {
  describe('when no component is open', () => {
    it('defaults to the package contents', () => {
      expect(selectTab(null, false)).toBe(COMPONENTS_TAB);
    });

    it('reads the shared value as the package distribution', () => {
      expect(selectTab(DISTRIBUTION_TAB, false)).toBe(DISTRIBUTION_TAB);
    });

    it("ignores the component's default, which is not a package tab", () => {
      expect(selectTab(INSTRUCTIONS_TAB, false)).toBe(COMPONENTS_TAB);
    });
  });

  describe('when a component is open', () => {
    it('defaults to its instructions', () => {
      expect(selectTab(null, true)).toBe(INSTRUCTIONS_TAB);
    });

    it('reads the shared value as the component distribution', () => {
      expect(selectTab(DISTRIBUTION_TAB, true)).toBe(DISTRIBUTION_TAB);
    });

    it("ignores the package's default, which is not a component tab", () => {
      expect(selectTab(COMPONENTS_TAB, true)).toBe(INSTRUCTIONS_TAB);
    });

    it('reads the history it alone has', () => {
      expect(selectTab(HISTORY_TAB, true)).toBe(HISTORY_TAB);
    });
  });

  /*
   * The address outlives the component: closing one leaves whatever tab was
   * open in the URL, and a package has no history to show.
   */
  describe('when a component-only tab is asked for with no component open', () => {
    it('answers with the package default', () => {
      expect(selectTab(HISTORY_TAB, false)).toBe(COMPONENTS_TAB);
    });
  });

  describe('when the address was hand edited', () => {
    it('answers with the package default while no component is open', () => {
      expect(selectTab('rules', false)).toBe(COMPONENTS_TAB);
    });

    it('answers with the component default while one is open', () => {
      expect(selectTab('rules', true)).toBe(INSTRUCTIONS_TAB);
    });
  });
});

describe('isDefaultTab', () => {
  it("keeps the package's default out of the address", () => {
    expect(isDefaultTab(COMPONENTS_TAB)).toBe(true);
  });

  it("keeps the component's default out of the address", () => {
    expect(isDefaultTab(INSTRUCTIONS_TAB)).toBe(true);
  });

  it('writes the tab the two depths share', () => {
    expect(isDefaultTab(DISTRIBUTION_TAB)).toBe(false);
  });

  it('writes the tab only a component has', () => {
    expect(isDefaultTab(HISTORY_TAB)).toBe(false);
  });
});

describe('isComponentOnlyTab', () => {
  it('says so of the history', () => {
    expect(isComponentOnlyTab(HISTORY_TAB)).toBe(true);
  });

  it('does not say so of the tab both depths have', () => {
    expect(isComponentOnlyTab(DISTRIBUTION_TAB)).toBe(false);
  });

  it('does not say so of a default', () => {
    expect(isComponentOnlyTab(INSTRUCTIONS_TAB)).toBe(false);
  });
});

/*
 * The three entities the space-wide lookup reads, in the shape the mappers
 * touch. Cast the way `buildPackageContext.spec` casts them: what they need is
 * five fields, and standing up three whole payloads would say nothing about
 * the lookup.
 */
const standardEntity = (id: string, name = id): Standard =>
  ({
    id: createStandardId(id),
    name,
    slug: name.toLowerCase(),
    description: '',
    version: 3,
  }) as Standard;

const commandEntity = (id: string, name = id): Command =>
  ({
    id: createCommandId(id),
    name,
    slug: name.toLowerCase(),
    content: 'body',
    version: 1,
  }) as Command;

const skillEntity = (id: string, name = id): Skill =>
  ({
    id: createSkillId(id),
    name,
    slug: name.toLowerCase(),
    description: '',
    version: 2,
  }) as Skill;

const catalogueOf = (parts: Partial<SpaceCatalogue> = {}): SpaceCatalogue => ({
  standards: parts.standards ?? [],
  commands: parts.commands ?? [],
  skills: parts.skills ?? [],
});

const pkgOf = (
  id: string,
  parts: Partial<PackageComponentIds> = {},
): PackageComponentIds & { id: PackageId } => ({
  id: createPackageId(id),
  standards: parts.standards ?? [],
  commands: parts.commands ?? [],
  skills: parts.skills ?? [],
});

describe('componentDetailHref with no package', () => {
  it('names the component and clears the package', () => {
    expect(
      componentDetailHref(
        new URLSearchParams('package=all&coverage=none'),
        null,
        'standard-1',
      ),
    ).toBe('?coverage=none&component=standard-1');
  });

  /*
   * The filter survives. Going back from the component lands on the part of
   * the inventory it was opened from rather than on the whole of it.
   */
  it('keeps everything else the reader arrived with', () => {
    expect(
      componentDetailHref(
        new URLSearchParams('nav=plugin-first&package=all'),
        null,
        'skill-1',
      ),
    ).toBe('?nav=plugin-first&component=skill-1');
  });
});

describe('withPaneDetailHref with no package', () => {
  it('points the row at the pane without naming a package', () => {
    expect(
      withPaneDetailHref(
        component('standard', 'standard-1'),
        new URLSearchParams('package=all'),
        null,
      ).href,
    ).toBe('?component=standard-1');
  });
});

describe('inventoryHref', () => {
  it('asks for the inventory and closes the component', () => {
    expect(inventoryHref(new URLSearchParams('component=standard-1'))).toBe(
      '?package=all',
    );
  });

  describe('when a tab only a component has is open', () => {
    it('drops it, since the inventory has no such tab', () => {
      expect(
        inventoryHref(
          new URLSearchParams(`component=standard-1&tab=${HISTORY_TAB}`),
        ),
      ).toBe('?package=all');
    });
  });

  describe('when the tab is one both depths share', () => {
    it('keeps it', () => {
      expect(
        inventoryHref(
          new URLSearchParams(`component=standard-1&tab=${DISTRIBUTION_TAB}`),
        ),
      ).toBe(`?tab=${DISTRIBUTION_TAB}&package=all`);
    });
  });
});

describe('findSpaceComponent', () => {
  describe('when the address names no component', () => {
    it('is nothing', () => {
      expect(
        findSpaceComponent(
          catalogueOf({ standards: [standardEntity('standard-1')] }),
          null,
          TARGET,
        ),
      ).toBeNull();
    });
  });

  it('is nothing for a key the space does not hold', () => {
    expect(
      findSpaceComponent(
        catalogueOf({ standards: [standardEntity('standard-1')] }),
        'standard-9',
        TARGET,
      ),
    ).toBeNull();
  });

  describe('when the key names a standard', () => {
    it('resolves it into a row', () => {
      expect(
        findSpaceComponent(
          catalogueOf({ standards: [standardEntity('standard-1', 'Naming')] }),
          'standard-1',
          TARGET,
        )?.name,
      ).toBe('Naming');
    });
  });

  describe('when the key names a command', () => {
    it('resolves it into a row', () => {
      expect(
        findSpaceComponent(
          catalogueOf({ commands: [commandEntity('command-1', 'Ship')] }),
          'command-1',
          TARGET,
        )?.type,
      ).toBe('command');
    });
  });

  describe('when the key names a skill', () => {
    it('resolves it into a row', () => {
      expect(
        findSpaceComponent(
          catalogueOf({ skills: [skillEntity('skill-1', 'Review')] }),
          'skill-1',
          TARGET,
        )?.type,
      ).toBe('skill');
    });
  });
});

describe('selectContextPackage', () => {
  describe('when the address names a package', () => {
    it('answers with it', () => {
      expect(
        selectContextPackage([pkgOf('pkg-1'), pkgOf('pkg-2')], 'pkg-2', null)
          ?.id,
      ).toBe('pkg-2');
    });

    /*
     * Which is the moment after a successful move: the address still names the
     * package the component left, and the pane answers with its list.
     */
    describe('when that package does not hold the open component', () => {
      it('answers with it anyway', () => {
        expect(
          selectContextPackage(
            [
              pkgOf('pkg-1', { standards: [createStandardId('standard-1')] }),
              pkgOf('pkg-2'),
            ],
            'pkg-2',
            { type: 'standard', key: 'standard-1' },
          )?.id,
        ).toBe('pkg-2');
      });
    });
  });

  describe('when the address names only a component', () => {
    it('answers with the package holding it', () => {
      expect(
        selectContextPackage(
          [
            pkgOf('pkg-1'),
            pkgOf('pkg-2', { standards: [createStandardId('standard-1')] }),
          ],
          null,
          { type: 'standard', key: 'standard-1' },
        )?.id,
      ).toBe('pkg-2');
    });

    describe('when two packages hold it', () => {
      it('answers with the first of them', () => {
        expect(
          selectContextPackage(
            [
              pkgOf('pkg-1', { standards: [createStandardId('standard-1')] }),
              pkgOf('pkg-2', { standards: [createStandardId('standard-1')] }),
            ],
            null,
            { type: 'standard', key: 'standard-1' },
          )?.id,
        ).toBe('pkg-1');
      });
    });

    /* Two entities of different types can carry the same id. */
    it('does not match a package holding that id under another type', () => {
      expect(
        selectContextPackage(
          [pkgOf('pkg-1', { commands: [createCommandId('shared-1')] })],
          null,
          { type: 'standard', key: 'shared-1' },
        ),
      ).toBeNull();
    });

    describe('when no package holds it', () => {
      it('answers with no package', () => {
        expect(
          selectContextPackage([pkgOf('pkg-1'), pkgOf('pkg-2')], null, {
            type: 'skill',
            key: 'skill-1',
          }),
        ).toBeNull();
      });
    });
  });

  describe('when the address names neither', () => {
    it('falls back to the first package', () => {
      expect(
        selectContextPackage([pkgOf('pkg-1'), pkgOf('pkg-2')], null, null)?.id,
      ).toBe('pkg-1');
    });

    it('answers with no package in a space that has none', () => {
      expect(selectContextPackage([], null, null)).toBeNull();
    });
  });

  /* A key the space does not hold arrives here as no component at all. */
  describe('when the package it names is gone', () => {
    it('falls back to the first package', () => {
      expect(selectContextPackage([pkgOf('pkg-1')], 'pkg-9', null)?.id).toBe(
        'pkg-1',
      );
    });
  });
});
