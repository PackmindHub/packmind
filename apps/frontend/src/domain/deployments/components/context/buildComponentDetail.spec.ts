import { createPackageId } from '@packmind/types';
import type {
  ContextComponent,
  ContextComponentType,
  ContextGroup,
} from './buildPackageContext';
import {
  componentDetailHref,
  componentEditHref,
  packageDetailHref,
  selectDetailComponent,
  sortFilesByPath,
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

describe('packageDetailHref', () => {
  it('drops the component', () => {
    expect(
      packageDetailHref(
        new URLSearchParams('package=pkg-1&component=command-1'),
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

  it('has nowhere to send a standard', () => {
    expect(
      componentEditHref(component('standard', 'standard-1'), TARGET),
    ).toBeNull();
  });

  it('has nowhere to send a skill', () => {
    expect(componentEditHref(component('skill', 'skill-1'), TARGET)).toBeNull();
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
