# Manage Your Organizations

## Overview

Organization administrators can manage team members, control access, and configure permissions for their organization. The Settings menu provides centralized access to user management and Git repository configuration.

:::info
Only users with **Admin** privileges can configure the organization.
:::

## User Management

### User Roles

Packmind has two user roles:

- **Admin**: Full access to organization settings, including user management and Git repository configuration
- **Member**: Standard user access without administrative privileges

### Inviting New Users

1. Go to **Settings** → **Users**
2. Click **Invite Users**
3. Enter email addresses
4. Select the role for the invited users (Admin or Member)
5. Click **Send Invitations**

#### Email Delivery

When you invite users:

- **With SMTP configured**: Invitation emails are sent automatically to the invited users. See [SMTP Configuration](./gs-install-self-hosted.md#smtp-configuration) for setup instructions.
- **Without SMTP configured**: The invitation email content and invitation link are logged in Packmind's logs. Self-hosted administrators can retrieve these links from the logs and share them manually with invited users.

Invited users receive a link that allows them to create their account and join your organization.

### Managing User Roles

Admins can change roles for other users in the organization:

1. Go to **Settings** → **Users**
2. Find the user in the list
3. Click **Change user role** from the actions column
4. Select the new role (Admin or Member)
5. Click **Save** to confirm

**Note**: You cannot change your own role. Changes take effect immediately.

### Removing Users

To remove a user from your organization:

1. Go to **Settings** → **Users**
2. Find the user in the list
3. Click **Remove** from the actions column
4. Confirm the removal

Removed users will lose access to the organization and its resources.

## Admin Privileges

Users with the **Admin** role have exclusive access to:

- **User Management**: Invite, remove, and change roles for organization members
- **Git Repository Configuration**: Add and manage Git providers and repositories (see [Git Repository Connection](./git-repository-connection.md))
- **Settings Menu**: Full access to all organization settings

The Settings menu is only visible to administrators in the sidebar navigation.
