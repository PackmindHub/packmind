import { isDomainError } from '../../errors';
import { InvalidArtifactIdError } from './InvalidArtifactIdError';
import { PackageNotPublishableAsPluginError } from './PackageNotPublishableAsPluginError';

describe('InvalidArtifactIdError', () => {
  const error = new InvalidArtifactIdError('not-a-uuid');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers invalid_input, since it does not depend on stored state', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('names the id back, since the caller is the one who supplied it', () => {
    expect(error.message).toContain('not-a-uuid');
  });

  it('keeps the id in the context', () => {
    expect(error.context).toEqual({ artefactId: 'not-a-uuid' });
  });
});

describe('PackageNotPublishableAsPluginError', () => {
  const error = new PackageNotPublishableAsPluginError('security', 'Security');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers conflict, since the package contents rule the publish out', () => {
    expect(error.kind).toBe('conflict');
  });

  it('keeps the slug in the context', () => {
    expect(error.context).toEqual({ packageSlug: 'security' });
  });

  it('names the package so the CLI can show why the publish was refused', () => {
    expect(error.message).toContain('Security');
  });
});
