/**
 * Server actions for admin user management.
 * Each action verifies the caller is an admin before proceeding.
 * Uses the service-role client to manage auth.users and profiles.
 */

'use server';

import { getServiceRoleClient, requireAdmin } from './service';
import type { AdminUser, Role } from './types';

/**
 * List all users (auth.users + profiles).
 * Returns an array of AdminUser objects.
 */
export async function listUsers(accessToken: string): Promise<AdminUser[]> {
  await requireAdmin(accessToken);

  const serviceClient = getServiceRoleClient();

  // Fetch all auth users
  const {
    data: { users },
    error: usersError,
  } = await serviceClient.auth.admin.listUsers();

  if (usersError) {
    throw new Error(`Failed to list users: ${usersError.message}`);
  }

  // Fetch profiles to get role info
  const { data: profiles, error: profilesError } = await serviceClient
    .from('profiles')
    .select('id, role');

  if (profilesError) {
    throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
  }

  const profileMap = new Map(
    profiles?.map((p) => [p.id, p.role as Role]) ?? []
  );

  return (users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? '',
    role: profileMap.get(u.id) ?? 'user',
    disabled: u.banned_until !== undefined && u.banned_until !== null,
    created_at: u.created_at,
  }));
}

/**
 * Create a new user with email, password, and role.
 * Also creates a profile row with the given role.
 */
export async function createUser(
  accessToken: string,
  email: string,
  password: string,
  role: Role
): Promise<AdminUser> {
  await requireAdmin(accessToken);

  const serviceClient = getServiceRoleClient();

  // Create auth user
  const {
    data: { user },
    error: createError,
  } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !user) {
    throw new Error(
      `Failed to create user: ${createError?.message ?? 'Unknown error'}`
    );
  }

  // Upsert profile with the specified role
  const { error: profileError } = await serviceClient.from('profiles').upsert({
    id: user.id,
    email,
    role,
  });

  if (profileError) {
    throw new Error(`Failed to create profile: ${profileError.message}`);
  }

  // Log audit trail (best-effort)
  await logAudit(serviceClient, {
    admin_id: await requireAdmin(accessToken),
    action: 'create_user',
    target_user_id: user.id,
    details: { email, role },
  });

  return {
    id: user.id,
    email: user.email ?? email,
    role,
    disabled: false,
    created_at: user.created_at,
  };
}

/**
 * Change a user's role in the profiles table.
 */
export async function setUserRole(
  accessToken: string,
  userId: string,
  role: Role
): Promise<void> {
  const adminId = await requireAdmin(accessToken);

  const serviceClient = getServiceRoleClient();

  // Update profile role
  const { error: updateError } = await serviceClient
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  if (updateError) {
    throw new Error(`Failed to update role: ${updateError.message}`);
  }

  // Log audit trail
  await logAudit(serviceClient, {
    admin_id: adminId,
    action: 'set_user_role',
    target_user_id: userId,
    details: { new_role: role },
  });
}

/**
 * Disable or enable a user account by setting ban_duration.
 * disabled=true bans the user for 99 years; disabled=false removes the ban.
 */
export async function setUserDisabled(
  accessToken: string,
  userId: string,
  disabled: boolean
): Promise<void> {
  const adminId = await requireAdmin(accessToken);

  const serviceClient = getServiceRoleClient();

  // Supabase auth.admin.updateUserById supports ban_duration (in seconds, or "none")
  const {
    data: { user },
    error: updateError,
  } = await serviceClient.auth.admin.updateUserById(userId, {
    ban_duration: disabled ? '876000h' : 'none', // 100 years or none
  });

  if (updateError || !user) {
    throw new Error(
      `Failed to ${disabled ? 'disable' : 'enable'} user: ${
        updateError?.message ?? 'Unknown error'
      }`
    );
  }

  // Log audit trail
  await logAudit(serviceClient, {
    admin_id: adminId,
    action: disabled ? 'disable_user' : 'enable_user',
    target_user_id: userId,
    details: { disabled },
  });
}

/**
 * Permanently delete a user (auth.users + cascades to profiles via FK).
 */
export async function deleteUser(
  accessToken: string,
  userId: string
): Promise<void> {
  const adminId = await requireAdmin(accessToken);

  const serviceClient = getServiceRoleClient();

  // Delete auth user (profile will cascade due to FK ON DELETE CASCADE)
  const { error: deleteError } =
    await serviceClient.auth.admin.deleteUser(userId);

  if (deleteError) {
    throw new Error(`Failed to delete user: ${deleteError.message}`);
  }

  // Log audit trail
  await logAudit(serviceClient, {
    admin_id: adminId,
    action: 'delete_user',
    target_user_id: userId,
    details: {},
  });
}

/**
 * Best-effort audit logging. If the audit_log table doesn't exist, silently continue.
 */
async function logAudit(
  client: ReturnType<typeof getServiceRoleClient>,
  entry: {
    admin_id: string;
    action: string;
    target_user_id: string;
    details: Record<string, unknown>;
  }
) {
  try {
    await client.from('audit_log').insert({
      admin_id: entry.admin_id,
      action: entry.action,
      target_user_id: entry.target_user_id,
      details: entry.details,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Table might not exist yet; ignore errors
  }
}
