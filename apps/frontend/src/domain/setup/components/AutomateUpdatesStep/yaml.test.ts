import { buildWorkflowYaml } from './yaml';

describe('buildWorkflowYaml', () => {
  describe('GitHub provider', () => {
    it('injects the default cron expression into the workflow', () => {
      const yaml = buildWorkflowYaml('github', '0 2 * * 1-5');
      expect(yaml).toContain('cron: "0 2 * * 1-5"');
      expect(yaml).not.toContain('{{CRON}}');
    });

    it.each([
      '0 2 * * 1-5',
      '0 9 * * 1',
      '*/5 * * * *',
      '0 0 1 1 *',
      '15 10 1-15 * *',
    ])('replaces the placeholder with the cron value: %s', (cron) => {
      const yaml = buildWorkflowYaml('github', cron);
      expect(yaml).toContain(`cron: "${cron}"`);
      expect(yaml).not.toContain('{{CRON}}');
    });

    it('exposes the expected workflow name', () => {
      expect(buildWorkflowYaml('github', '0 2 * * 1-5')).toContain(
        'name: Nightly Packmind update',
      );
    });

    it('references the PACKMIND_API_KEY_V3 secret', () => {
      expect(buildWorkflowYaml('github', '0 2 * * 1-5')).toContain(
        'secrets.PACKMIND_API_KEY_V3',
      );
    });

    it('keeps workflow_dispatch for manual runs', () => {
      expect(buildWorkflowYaml('github', '0 2 * * 1-5')).toContain(
        'workflow_dispatch:',
      );
    });
  });

  describe('GitLab provider', () => {
    it('returns a template that does not depend on the cron value', () => {
      const a = buildWorkflowYaml('gitlab', '0 2 * * 1-5');
      const b = buildWorkflowYaml('gitlab', '0 9 * * 1');
      const c = buildWorkflowYaml('gitlab', '*/5 * * * *');
      expect(a).toBe(b);
      expect(b).toBe(c);
    });

    it('exposes the expected job name', () => {
      expect(buildWorkflowYaml('gitlab', '0 2 * * 1-5')).toContain(
        'nightly-packmind-update:',
      );
    });

    it('references PACKMIND_BOT_TOKEN for git push authentication', () => {
      // PACKMIND_API_KEY_V3 is consumed by the CLI from the GitLab CI env
      // automatically, so it is not referenced literally in the YAML.
      const yaml = buildWorkflowYaml('gitlab', '0 2 * * 1-5');
      expect(yaml).toContain('PACKMIND_BOT_TOKEN');
    });

    it('keeps GitLab CI variables un-interpolated', () => {
      const yaml = buildWorkflowYaml('gitlab', '0 2 * * 1-5');
      expect(yaml).toContain('${PACKMIND_BOT_TOKEN}');
      expect(yaml).toContain('${CI_SERVER_HOST}');
      expect(yaml).toContain('${CI_PROJECT_PATH}');
      expect(yaml).toContain('${CI_DEFAULT_BRANCH}');
      expect(yaml).toContain('$CI_PIPELINE_SOURCE');
    });

    it('runs on schedule and manual pipeline triggers', () => {
      const yaml = buildWorkflowYaml('gitlab', '0 2 * * 1-5');
      expect(yaml).toContain('$CI_PIPELINE_SOURCE == "schedule"');
      expect(yaml).toContain('$CI_PIPELINE_SOURCE == "web"');
    });
  });
});
