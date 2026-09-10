import type { Skill } from '@packmind/types';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useGetSpaceMembersQuery } from '../../spaces/api/queries/SpacesQueries';

/**
 * Whether this reader may edit a skill's files, including SKILL.md.
 *
 * A gate for the UI only. It mirrors `UpdateSkillFileFromUIUseCase`'s own
 * check — admin of the space, admin of the organization, or the skill's
 * creator — and the server stays the source of truth and answers 403 if this is
 * ever wrong. Showing a control the server will refuse is the failure this
 * prevents; hiding one it would have allowed is the cost of being wrong the
 * safe way.
 *
 * A hook rather than the four lines it replaces, because two surfaces ask the
 * question now. The skill's own file page asked it inline, the Context pane did
 * not ask it at all and was read-only for that reason, and two copies of a
 * permission rule is how a control ends up offered on one surface and refused
 * on the other.
 *
 * The skill is nullable so a caller can ask before its query has answered. No
 * skill reads as no permission, which is also what an unresolved membership
 * list reads as: the control appears when the answer is known and yes.
 */
export function useCanEditSkillFiles(
  skill: Pick<Skill, 'spaceId' | 'userId'> | null | undefined,
): boolean {
  const { user, organization } = useAuthContext();
  /*
   * The query is gated on both ids, so the empty string is a query that never
   * runs rather than one that asks about a space called nothing.
   */
  const { data: members } = useGetSpaceMembersQuery(skill?.spaceId ?? '');

  if (!skill) return false;

  const isOrgAdmin = organization?.role === 'admin';
  const isCreator = !!user?.id && skill.userId === user.id;
  const isSpaceAdmin =
    members?.members?.find((member) => member.userId === user?.id)?.role ===
    'admin';

  return isSpaceAdmin || isOrgAdmin || isCreator;
}
