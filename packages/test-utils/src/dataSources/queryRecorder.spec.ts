import { v4 as uuidv4 } from 'uuid';
import { createQueryRecorder } from './queryRecorder';
import { createTestDatasourceFixture } from './testDatasource';
import { TestUserSchema } from './testUserSchema';

describe('createQueryRecorder', () => {
  describe('countMatching', () => {
    it('counts the statements matching a regex', () => {
      const recorder = createQueryRecorder();

      recorder.logger.logQuery('SELECT * FROM "users"');
      recorder.logger.logQuery('SELECT * FROM "skills"');
      recorder.logger.logQuery('SELECT * FROM "users" WHERE id = $1');

      expect(recorder.countMatching(/from "users"/i)).toBe(2);
    });

    it('counts the statements matching a substring', () => {
      const recorder = createQueryRecorder();

      recorder.logger.logQuery('SELECT * FROM "skills"');

      expect(recorder.countMatching('"skills"')).toBe(1);
    });

    it('does not skip matches when the regex is global', () => {
      const recorder = createQueryRecorder();

      recorder.logger.logQuery('SELECT * FROM "users"');
      recorder.logger.logQuery('SELECT * FROM "users"');

      expect(recorder.countMatching(/users/g)).toBe(2);
    });
  });

  describe('reset', () => {
    it('drops the recorded statements', () => {
      const recorder = createQueryRecorder();
      recorder.logger.logQuery('SELECT 1');

      recorder.reset();

      expect(recorder.queries).toEqual([]);
    });
  });
});

describe('createTestDatasourceFixture with recordQueries', () => {
  const fixture = createTestDatasourceFixture([TestUserSchema], {
    recordQueries: true,
  });

  beforeAll(() => fixture.initialize());
  afterEach(() => fixture.cleanup());
  afterAll(() => fixture.destroy());

  it('records the statements the datasource issues', async () => {
    const repository = fixture.datasource.getRepository(TestUserSchema);
    await repository.save({
      id: uuidv4(),
      email: 'alice@packmind.com',
      displayName: 'Alice',
    });

    fixture.queries.reset();
    await repository.find();

    expect(fixture.queries.countMatching(/from "users"/i)).toBe(1);
  });
});

describe('createTestDatasourceFixture without recordQueries', () => {
  const fixture = createTestDatasourceFixture([TestUserSchema]);

  beforeAll(() => fixture.initialize());
  afterAll(() => fixture.destroy());

  it('explains that recording is off when queries are read', () => {
    expect(() => fixture.queries).toThrow(
      'Pass { recordQueries: true } to createTestDatasourceFixture',
    );
  });
});
