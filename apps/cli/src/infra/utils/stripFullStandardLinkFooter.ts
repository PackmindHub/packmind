// The server-side standard renderer appends a trailing
// `Full standard is available here for further request: [name](.../.packmind/standards/<slug>.md)`
// line. In home-install mode we drop the `.packmind/` mirror folder, so that
// link target never exists on disk. Both the install step (when rendering
// content) and the playbook diff step (when reading the server's view of the
// content) must strip this footer so disk and server stay byte-aligned.
export function stripFullStandardLinkFooter(content: string): string {
  return content.replace(
    /\n+Full standard is available here for further request: \[.+?]\(.+?\.packmind\/standards\/.+?\)\s*$/,
    '',
  );
}
