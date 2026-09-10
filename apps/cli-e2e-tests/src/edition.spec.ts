import { PACKMIND_EDITION_HEADER } from '@packmind/types';
import fs from 'fs';

import {
  describeForEdition,
  describeWithUserSignedUp,
  getPackmindInstanceUrl,
  RunCliResult,
  setupGitRepo,
  updateFile,
  UserSignedUpContext,
} from './helpers';

/**
 * The Community Edition stubs out the change-proposal routes, so they answer
 * 404 there and the CLI has to tell that apart from a 404 for a resource that
 * is gone. It reads the edition off the header this suite checks reaches it
 * through the whole stack, proxy included, which no unit test can show.
 */
describeForEdition('community', 'edition', () => {
  describe('the API', () => {
    let matched: Response;
    let unmatched: Response;

    beforeAll(async () => {
      const host = getPackmindInstanceUrl();
      matched = await fetch(`${host}/api/v0/auth/me`);
      unmatched = await fetch(`${host}/api/v0/no-such-route`);
    });

    it('publishes the edition on a route it serves', () => {
      expect(matched.headers.get(PACKMIND_EDITION_HEADER)).toBe('community');
    });

    describe('on a route it does not serve', () => {
      // The one that matters: an absent feature is exactly an unmatched route.
      it('answers 404', () => {
        expect(unmatched.status).toBe(404);
      });

      it('publishes the edition anyway', () => {
        expect(unmatched.headers.get(PACKMIND_EDITION_HEADER)).toBe(
          'community',
        );
      });
    });
  });

  describeWithUserSignedUp('playbook submit', (getContext) => {
    let context: UserSignedUpContext;
    let added: RunCliResult;
    let result: RunCliResult;

    beforeEach(async () => {
      context = await getContext();
      await setupGitRepo(context.testDir);
      updateFile(
        'packmind.json',
        JSON.stringify({ packages: {} }),
        context.testDir,
      );

      fs.mkdirSync(`${context.testDir}/.packmind/standards/`, {
        recursive: true,
      });
      updateFile(
        '.packmind/standards/my-standard.md',
        '# My new standard\n\nWith a description:\n\n* rule 1\n',
        context.testDir,
      );

      added = await context.runCli(
        'playbook add .packmind/standards/my-standard.md',
      );
      result = await context.runCli('playbook submit -m "A message"');
    });

    // Asserted rather than assumed: an `add` that failed would otherwise
    // surface as a confusing mismatch on the submit assertions below.
    it('stages the artefact first', () => {
      expect(added.returnCode).toBe(0);
    });

    it('reports the feature as absent from this edition', () => {
      expect(result.stderr).toContain(
        'The "change proposals" feature is not available in Packmind Community Edition.',
      );
    });

    it('points at the flag that submits without review', () => {
      expect(result.stdout).toContain('playbook submit --no-review');
    });

    it('fails, since nothing was submitted', () => {
      expect(result.returnCode).toBe(1);
    });
  });
});
