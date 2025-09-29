/**
 * Command for the /auth/signup endpoint.
 * This is now simplified to only support the combined user + organization creation flow.
 */
export type SignUpUserCommand = {
  email: string;
  password: string;
  organizationName: string;
  // Legacy field kept for backward compatibility during transition
  organizationId?: never;
};
