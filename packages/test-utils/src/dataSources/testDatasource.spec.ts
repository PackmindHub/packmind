import { EntitySchema } from 'typeorm';
import { createTestDatasourceFixture } from './testDatasource';

const WidgetSchema = new EntitySchema({
  name: 'Widget',
  tableName: 'widgets',
  columns: {
    id: { type: 'uuid', primary: true },
    label: { type: 'varchar' },
  },
});

type Widget = { id: string; label: string };

describe('createTestDatasourceFixture', () => {
  const fixture = createTestDatasourceFixture([WidgetSchema]);

  const insertWidget = (label: string) =>
    fixture.datasource
      .getRepository<Widget>(WidgetSchema)
      .save({ id: crypto.randomUUID(), label });

  const listLabels = async () =>
    (await fixture.datasource.getRepository<Widget>(WidgetSchema).find())
      .map((widget) => widget.label)
      .sort();

  describe('when no snapshot was taken', () => {
    beforeAll(() => fixture.initialize());
    afterEach(() => fixture.cleanup());
    afterAll(() => fixture.destroy());

    it('starts each test with an empty database', async () => {
      await insertWidget('first');

      expect(await listLabels()).toEqual(['first']);
    });

    it('does not see rows inserted by the previous test', async () => {
      expect(await listLabels()).toEqual([]);
    });
  });
});

describe('createTestDatasourceFixture with a snapshot', () => {
  const fixture = createTestDatasourceFixture([WidgetSchema]);

  const insertWidget = (label: string) =>
    fixture.datasource
      .getRepository<Widget>(WidgetSchema)
      .save({ id: crypto.randomUUID(), label });

  const listLabels = async () =>
    (await fixture.datasource.getRepository<Widget>(WidgetSchema).find())
      .map((widget) => widget.label)
      .sort();

  beforeAll(async () => {
    await fixture.initialize();
    await insertWidget('seeded');
    fixture.snapshot();
  });

  afterEach(() => fixture.cleanup());
  afterAll(() => fixture.destroy());

  it('starts from the seeded rows', async () => {
    expect(await listLabels()).toEqual(['seeded']);
  });

  it('rewinds rows inserted by a test', async () => {
    await insertWidget('added by this test');

    expect(await listLabels()).toEqual(['added by this test', 'seeded']);
  });

  it('does not keep the previous test insertion', async () => {
    expect(await listLabels()).toEqual(['seeded']);
  });

  it('rewinds rows deleted by a test', async () => {
    await fixture.datasource
      .getRepository<Widget>(WidgetSchema)
      .delete({ label: 'seeded' });

    expect(await listLabels()).toEqual([]);
  });

  it('restores rows deleted by the previous test', async () => {
    expect(await listLabels()).toEqual(['seeded']);
  });

  describe('when snapshot is called before initialize', () => {
    it('throws an explicit error', () => {
      const uninitialized = createTestDatasourceFixture([WidgetSchema]);

      expect(() => uninitialized.snapshot()).toThrow(
        'Datasource not initialized. Call initialize() in beforeAll.',
      );
    });
  });
});
