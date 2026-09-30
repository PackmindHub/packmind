// `https://user:token@host/...`: a web remote carries its credentials whole.
const WEB_USERINFO = /^(https?:\/\/)[^@/]*@/i;
// `ssh://user:secret@host/...`: an SSH user names an account, its password
// does not belong in a remote Packmind keeps.
const PASSWORD = /^([a-z][a-z0-9+.-]*:\/\/[^:@/]*):[^@/]*@/i;

/**
 * A git remote without the credentials a clone URL may embed, such as the
 * `oauth2:<token>@` GitLab documents for HTTPS clones, so the remote can be
 * logged and stored.
 */
export function stripGitRemoteCredentials(gitRemoteUrl: string): string {
  const trimmed = gitRemoteUrl.trim();
  if (WEB_USERINFO.test(trimmed)) {
    return trimmed.replace(WEB_USERINFO, '$1');
  }
  return trimmed.replace(PASSWORD, '$1@');
}
